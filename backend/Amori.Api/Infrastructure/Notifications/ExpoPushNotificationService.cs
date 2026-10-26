using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Amori.Api.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Amori.Api.Infrastructure.Notifications;

/// <summary>
/// Push delivery via the Expo Push API (<c>https://exp.host/--/api/v2/push/send</c>).
///
/// A single HTTP endpoint fans out to APNs (iOS) and FCM (Android) from one
/// Expo push token, so the same call works for both platforms. Device tokens
/// are the ExponentPushToken[...] values the app registers via
/// <c>/api/notifications/devices</c>.
///
/// This is intentionally provider-agnostic behind <see cref="IPushNotificationService"/>:
/// swap this class for an FCM/APNs/SNS implementation without touching callers.
/// </summary>
public sealed class ExpoPushNotificationService(
    HttpClient httpClient,
    AmoriDbContext db,
    ILogger<ExpoPushNotificationService> logger) : IPushNotificationService
{
    private const string ExpoPushEndpoint = "https://exp.host/--/api/v2/push/send";

    public async Task SendAsync(
        string deviceToken,
        string title,
        string body,
        IDictionary<string, string>? data = null,
        CancellationToken cancellationToken = default)
    {
        await SendToTokensAsync([deviceToken], title, body, data, cancellationToken);
    }

    public async Task SendToUserAsync(
        Guid userId,
        string title,
        string body,
        IDictionary<string, string>? data = null,
        CancellationToken cancellationToken = default)
    {
        var tokens = await db.DeviceRegistrations
            .Where(d => d.UserId == userId && d.IsActive)
            .Select(d => d.DeviceToken)
            .ToListAsync(cancellationToken);

        if (tokens.Count == 0)
        {
            logger.LogInformation("No active devices for user {UserId}; skipping push.", userId);
            return;
        }

        await SendToTokensAsync(tokens, title, body, data, cancellationToken);
    }

    private async Task SendToTokensAsync(
        IReadOnlyList<string> tokens,
        string title,
        string body,
        IDictionary<string, string>? data,
        CancellationToken ct)
    {
        // Expo accepts a batch (array) of messages in a single request.
        var messages = tokens
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => new ExpoPushMessage
            {
                To = t,
                Title = title,
                Body = body,
                Sound = "default",
                // Expo's default is "normal" on Android, which may be delayed or held
                // back while the phone sleeps. These pushes are someone reaching out
                // (a chat, a hug), so ask for prompt delivery.
                Priority = "high",
                Data = data
            })
            .ToList();

        if (messages.Count == 0)
            return;

        using var response = await httpClient.PostAsJsonAsync(ExpoPushEndpoint, messages, ct);

        if (!response.IsSuccessStatusCode)
        {
            var payload = await response.Content.ReadAsStringAsync(ct);
            logger.LogWarning("Expo push request failed ({Status}): {Payload}",
                (int)response.StatusCode, payload);
            return;
        }

        await LogRejectedTicketsAsync(response, messages, ct);
    }

    /// <summary>
    /// Expo answers 200 even when it refuses a message, and says so per message in
    /// the response body (e.g. InvalidCredentials when the FCM key was never
    /// uploaded, DeviceNotRegistered for a stale token). Without reading it, an
    /// Android push that never arrives leaves no trace, so surface each rejection.
    /// Best-effort: an unreadable body must never fail the send.
    /// </summary>
    private async Task LogRejectedTicketsAsync(
        HttpResponseMessage response, IReadOnlyList<ExpoPushMessage> messages, CancellationToken ct)
    {
        try
        {
            var result = await response.Content.ReadFromJsonAsync<ExpoPushResponse>(cancellationToken: ct);
            if (result is null) return;

            foreach (var error in result.Errors ?? [])
                logger.LogWarning("Expo rejected the push request: {Code} {Message}", error.Code, error.Message);

            var tickets = result.Data ?? [];
            for (var i = 0; i < tickets.Count && i < messages.Count; i++)
            {
                var ticket = tickets[i];
                if (!string.Equals(ticket.Status, "error", StringComparison.OrdinalIgnoreCase)) continue;

                logger.LogWarning(
                    "Expo rejected a push for device …{TokenTail}: {Error} {Message}",
                    TokenTail(messages[i].To), ticket.Details?.Error ?? "unknown", ticket.Message);
            }
        }
        catch (Exception ex) when (ex is System.Text.Json.JsonException or NotSupportedException)
        {
            logger.LogDebug(ex, "Could not read the Expo push response body.");
        }
    }

    /// <summary>Last few characters only, enough to tell devices apart without logging the token.</summary>
    private static string TokenTail(string token) =>
        token.Length <= 6 ? token : token[^6..];

    private sealed class ExpoPushMessage
    {
        [JsonPropertyName("to")]
        public string To { get; init; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; init; } = string.Empty;

        [JsonPropertyName("body")]
        public string Body { get; init; } = string.Empty;

        [JsonPropertyName("sound")]
        public string? Sound { get; init; }

        [JsonPropertyName("priority")]
        public string? Priority { get; init; }

        [JsonPropertyName("data")]
        public IDictionary<string, string>? Data { get; init; }
    }

    // The slice of the Expo push response we read: per-message tickets, plus
    // request-level errors that apply to the whole call.
    private sealed class ExpoPushResponse
    {
        [JsonPropertyName("data")]
        public List<ExpoPushTicket>? Data { get; init; }

        [JsonPropertyName("errors")]
        public List<ExpoRequestError>? Errors { get; init; }
    }

    private sealed class ExpoPushTicket
    {
        [JsonPropertyName("status")]
        public string? Status { get; init; }

        [JsonPropertyName("message")]
        public string? Message { get; init; }

        [JsonPropertyName("details")]
        public ExpoTicketDetails? Details { get; init; }
    }

    private sealed class ExpoTicketDetails
    {
        [JsonPropertyName("error")]
        public string? Error { get; init; }
    }

    private sealed class ExpoRequestError
    {
        [JsonPropertyName("code")]
        public string? Code { get; init; }

        [JsonPropertyName("message")]
        public string? Message { get; init; }
    }
}
