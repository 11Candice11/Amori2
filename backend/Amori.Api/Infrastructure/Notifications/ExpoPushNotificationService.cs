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
        }
    }

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

        [JsonPropertyName("data")]
        public IDictionary<string, string>? Data { get; init; }
    }
}
