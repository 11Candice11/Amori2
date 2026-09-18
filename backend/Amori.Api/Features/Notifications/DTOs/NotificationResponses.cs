using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Notifications.DTOs;

public sealed class DeviceRegistrationResponse
{
    public Guid Id { get; init; }
    public string DeviceToken { get; init; } = string.Empty;
    public NotificationPlatform Platform { get; init; }
    public string? DeviceIdentifier { get; init; }
    public bool IsActive { get; init; }
    public DateTime? LastSeenAt { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class NotificationResponse
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Body { get; init; } = string.Empty;
    public string? NotificationType { get; init; }
    public string? ReferenceId { get; init; }
    public bool IsRead { get; init; }
    public DateTime? ReadAt { get; init; }
    public DateTime CreatedAt { get; init; }
}
