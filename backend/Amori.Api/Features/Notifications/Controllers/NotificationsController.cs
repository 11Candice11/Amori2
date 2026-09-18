using Amori.Api.Features.Notifications.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Notifications.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Notifications.Controllers;

/// <summary>Device registration and in-app notification management.</summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
public sealed class NotificationsController(
    INotificationService notificationService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>Register a device for push notifications.</summary>
    [HttpPost("devices")]
    [ProducesResponseType(typeof(DeviceRegistrationResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> RegisterDevice([FromBody] RegisterDeviceRequest req, CancellationToken ct)
    {
        var result = await notificationService.RegisterDeviceAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(RegisterDevice), new { }, result);
    }

    /// <summary>Deregister / remove a device.</summary>
    [HttpDelete("devices/{deviceId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RemoveDevice(Guid deviceId, CancellationToken ct)
    {
        await notificationService.RemoveDeviceAsync(RequireUserId(), deviceId, ct);
        return NoContent();
    }

    /// <summary>Get all notifications for the authenticated user.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<NotificationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNotifications(CancellationToken ct) =>
        Ok(await notificationService.GetNotificationsAsync(RequireUserId(), ct));

    /// <summary>Mark a notification as read.</summary>
    [HttpPost("{notificationId:guid}/read")]
    [ProducesResponseType(typeof(NotificationResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkRead(Guid notificationId, CancellationToken ct) =>
        Ok(await notificationService.MarkReadAsync(RequireUserId(), notificationId, ct));

    /// <summary>Mark all notifications as read.</summary>
    [HttpPost("read-all")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        await notificationService.MarkAllReadAsync(RequireUserId(), ct);
        return NoContent();
    }
}
