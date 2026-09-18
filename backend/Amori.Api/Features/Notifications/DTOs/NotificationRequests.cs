using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Notifications.DTOs;

public sealed class RegisterDeviceRequest
{
    public string DeviceToken { get; set; } = string.Empty;
    public NotificationPlatform Platform { get; set; }
    public string? DeviceIdentifier { get; set; }
}
