namespace Amori.Api.Features.Notifications.Models;

/// <summary>
/// Internal model for push notification dispatch payload.
/// </summary>
public sealed class PushNotificationPayload
{
    public string Title { get; init; } = string.Empty;
    public string Body { get; init; } = string.Empty;
    public string? NotificationType { get; init; }
    public string? ReferenceId { get; init; }
    public IReadOnlyList<string> DeviceTokens { get; init; } = [];
}
