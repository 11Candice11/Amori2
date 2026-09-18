using Amori.Api.Features.Notifications.DTOs;

namespace Amori.Api.Features.Notifications.Services;

/// <summary>
/// Business logic for device registration and in-app notification management.
/// </summary>
public interface INotificationService
{
    Task<DeviceRegistrationResponse> RegisterDeviceAsync(Guid userId, RegisterDeviceRequest request, CancellationToken ct = default);
    Task RemoveDeviceAsync(Guid userId, Guid deviceId, CancellationToken ct = default);
    Task<IReadOnlyList<NotificationResponse>> GetNotificationsAsync(Guid userId, CancellationToken ct = default);
    Task<NotificationResponse> MarkReadAsync(Guid userId, Guid notificationId, CancellationToken ct = default);
    Task MarkAllReadAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Persist an in-app notification for <paramref name="userId"/> and, when the
    /// user has push enabled and registered devices, dispatch a push message.
    /// Best-effort: push failures never throw so callers aren't blocked.
    /// </summary>
    Task CreateAsync(
        Guid userId,
        string title,
        string body,
        string? notificationType = null,
        string? referenceId = null,
        CancellationToken ct = default);
}
