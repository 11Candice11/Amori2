using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Amori.Api.Features.Notifications.DTOs;
using Amori.Api.Infrastructure.Notifications;

namespace Amori.Api.Features.Notifications.Services;

public sealed class NotificationService(
    AmoriDbContext db,
    IPushNotificationService push,
    ILogger<NotificationService> logger) : INotificationService
{
    private static DeviceRegistrationResponse MapDevice(DeviceRegistration d) => new()
    {
        Id = d.Id, DeviceToken = d.DeviceToken, Platform = d.Platform,
        DeviceIdentifier = d.DeviceIdentifier, IsActive = d.IsActive,
        LastSeenAt = d.LastSeenAt, CreatedAt = d.CreatedAt
    };

    /// <summary>
    /// Decides whether a push may be dispatched for a notification type, given
    /// the recipient's preferences. The master switch wins over everything; a
    /// type with no specific preference is governed by the master switch alone.
    ///
    /// This gates the push only — the in-app notification is always persisted so
    /// the bell stays a complete record regardless of push preferences.
    /// </summary>
    private static bool IsPushAllowed(string? notificationType, UserSettings settings)
    {
        // PushNotificationsEnabled is the legacy master switch; it predates
        // NotificationsEnabled and is still honoured so existing opt-outs stick.
        if (!settings.NotificationsEnabled || !settings.PushNotificationsEnabled)
            return false;

        return notificationType switch
        {
            NotificationTypes.Hug => settings.HugNotifications,
            NotificationTypes.Emergency => settings.EmergencyNotifications,
            NotificationTypes.PartnerActivity => settings.PartnerActivityNotifications,
            // A gift is a form of partner activity, so it shares that toggle.
            NotificationTypes.Gift => settings.PartnerActivityNotifications,
            // Vision Board add/complete are partner activity too.
            NotificationTypes.VisionBoardItemAdded => settings.PartnerActivityNotifications,
            NotificationTypes.VisionBoardItemCompleted => settings.PartnerActivityNotifications,
            NotificationTypes.CheckInReminder => settings.CheckInReminders,
            NotificationTypes.DailyDigest => settings.DailyDigest,
            _ => true,
        };
    }

    private static NotificationResponse MapNotification(AppNotification n) => new()
    {
        Id = n.Id, Title = n.Title, Body = n.Body,
        NotificationType = n.NotificationType, ReferenceId = n.ReferenceId,
        IsRead = n.IsRead, ReadAt = n.ReadAt, CreatedAt = n.CreatedAt
    };

    public async Task<DeviceRegistrationResponse> RegisterDeviceAsync(Guid userId, RegisterDeviceRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.DeviceToken)) throw new ValidationException("DeviceToken is required.");

        var existing = await db.DeviceRegistrations
            .FirstOrDefaultAsync(d => d.UserId == userId && d.DeviceToken == request.DeviceToken, ct);

        if (existing != null)
        {
            existing.IsActive = true;
            existing.LastSeenAt = DateTime.UtcNow;
            existing.Platform = request.Platform;
            existing.DeviceIdentifier = request.DeviceIdentifier ?? existing.DeviceIdentifier;
            await db.SaveChangesAsync(ct);
            return MapDevice(existing);
        }

        var device = new DeviceRegistration
        {
            UserId = userId, DeviceToken = request.DeviceToken,
            Platform = request.Platform, DeviceIdentifier = request.DeviceIdentifier,
            LastSeenAt = DateTime.UtcNow
        };
        db.DeviceRegistrations.Add(device);
        await db.SaveChangesAsync(ct);
        return MapDevice(device);
    }

    public async Task RemoveDeviceAsync(Guid userId, Guid deviceId, CancellationToken ct = default)
    {
        var device = await db.DeviceRegistrations.FindAsync([deviceId], ct)
            ?? throw new NotFoundException("Device", deviceId);
        if (device.UserId != userId) throw new UnauthorizedException();
        db.DeviceRegistrations.Remove(device);
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<NotificationResponse>> GetNotificationsAsync(Guid userId, CancellationToken ct = default) =>
        await db.AppNotifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => MapNotification(n)).ToListAsync(ct);

    public async Task<NotificationResponse> MarkReadAsync(Guid userId, Guid notificationId, CancellationToken ct = default)
    {
        var n = await db.AppNotifications.FindAsync([notificationId], ct)
            ?? throw new NotFoundException("Notification", notificationId);
        if (n.UserId != userId) throw new UnauthorizedException();
        n.IsRead = true;
        n.ReadAt ??= DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return MapNotification(n);
    }

    public async Task MarkAllReadAsync(Guid userId, CancellationToken ct = default)
    {
        var unread = await db.AppNotifications
            .Where(n => n.UserId == userId && !n.IsRead).ToListAsync(ct);
        var now = DateTime.UtcNow;
        foreach (var n in unread) { n.IsRead = true; n.ReadAt = now; }
        await db.SaveChangesAsync(ct);
    }

    public async Task CreateAsync(
        Guid userId,
        string title,
        string body,
        string? notificationType = null,
        string? referenceId = null,
        CancellationToken ct = default)
    {
        // Always persist the in-app notification so it shows in the bell/list,
        // even if the user has push disabled or no registered device.
        var notification = new AppNotification
        {
            UserId = userId,
            Title = title,
            Body = body,
            NotificationType = notificationType,
            ReferenceId = referenceId
        };
        db.AppNotifications.Add(notification);
        await db.SaveChangesAsync(ct);

        // Respect the user's push preferences. No settings row yet means the
        // defaults (all enabled) apply, so send.
        var settings = await db.UserSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        if (settings != null && !IsPushAllowed(notificationType, settings))
            return;

        var data = new Dictionary<string, string>
        {
            ["notificationId"] = notification.Id.ToString()
        };
        if (notificationType is not null) data["type"] = notificationType;
        if (referenceId is not null) data["referenceId"] = referenceId;

        // Best-effort push dispatch — never let a push failure break the caller.
        try
        {
            await push.SendToUserAsync(userId, title, body, data, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Push dispatch failed for user {UserId} (notification {NotificationId})",
                userId, notification.Id);
        }
    }
}
