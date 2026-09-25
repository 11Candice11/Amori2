using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Features.Users.DTOs;
using Amori.Api.Infrastructure.Relationships;
using Microsoft.EntityFrameworkCore;

namespace Amori.Api.Features.Users.Services;

public sealed class UserService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess) : IUserService
{
    // A partner is considered "online" if they were active within this window.
    private static readonly TimeSpan OnlineWindow = TimeSpan.FromMinutes(5);

    public async Task<GetCurrentUserResponse> GetCurrentUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct)
            ?? throw new NotFoundException("User", userId);

        // Fetching "me" is a reliable signal the user is active in the app, so
        // stamp presence here. This backs the "Share activity" feature.
        user.LastActiveAt = DateTime.UtcNow;

        var settings = await GetOrCreateSettingsAsync(userId, ct);

        await db.SaveChangesAsync(ct);

        return ToResponse(user, settings);
    }

    public async Task<GetCurrentUserResponse> UpdateSettingsAsync(
        Guid userId, UpdateUserSettingsRequest request, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct)
            ?? throw new NotFoundException("User", userId);

        var settings = await GetOrCreateSettingsAsync(userId, ct);

        // Privacy & Sharing
        if (request.ShareMood.HasValue) settings.MoodShareDefault = request.ShareMood.Value;
        if (request.ShareActivity.HasValue) settings.ShareActivity = request.ShareActivity.Value;
        if (request.ShareCheckIns.HasValue) settings.ShareCheckIns = request.ShareCheckIns.Value;
        if (request.ShareLocation.HasValue) settings.ShareLocation = request.ShareLocation.Value;
        if (request.ShareTimeline.HasValue) settings.ShareTimeline = request.ShareTimeline.Value;

        // Permissions
        if (request.AllowHugs.HasValue) settings.AllowHugs = request.AllowHugs.Value;
        if (request.AllowEmergencyAlerts.HasValue) settings.AllowEmergencyAlerts = request.AllowEmergencyAlerts.Value;
        if (request.AllowPartnerReminders.HasValue) settings.AllowPartnerReminders = request.AllowPartnerReminders.Value;

        // Notifications
        if (request.NotificationsEnabled.HasValue) settings.NotificationsEnabled = request.NotificationsEnabled.Value;
        if (request.HugNotifications.HasValue) settings.HugNotifications = request.HugNotifications.Value;
        if (request.EmergencyNotifications.HasValue) settings.EmergencyNotifications = request.EmergencyNotifications.Value;
        if (request.CheckInReminders.HasValue) settings.CheckInReminders = request.CheckInReminders.Value;
        if (request.PartnerActivityNotifications.HasValue) settings.PartnerActivityNotifications = request.PartnerActivityNotifications.Value;
        if (request.DailyDigest.HasValue) settings.DailyDigest = request.DailyDigest.Value;

        // App Preferences
        if (request.SoundEnabled.HasValue) settings.SoundEnabled = request.SoundEnabled.Value;
        if (request.VibrationEnabled.HasValue) settings.VibrationEnabled = request.VibrationEnabled.Value;

        await db.SaveChangesAsync(ct);

        return ToResponse(user, settings);
    }

    public async Task<PartnerStatusResponse> GetPartnerStatusAsync(Guid userId, CancellationToken ct = default)
    {
        var partner = await relAccess.GetPartnerAsync(userId);
        if (partner == null)
            return new PartnerStatusResponse { IsLinked = false };

        var partnerSettings = await db.UserSettings
            .FirstOrDefaultAsync(s => s.UserId == partner.Id, ct);

        // Respect the partner's "Share activity" preference. If they've opted
        // out (or have no settings row yet defaulting to shared), hide presence.
        var sharesActivity = partnerSettings?.ShareActivity ?? true;

        var isOnline = sharesActivity
            && partner.LastActiveAt.HasValue
            && DateTime.UtcNow - partner.LastActiveAt.Value <= OnlineWindow;

        return new PartnerStatusResponse
        {
            IsLinked = true,
            IsOnline = isOnline,
            LastActiveAt = sharesActivity ? partner.LastActiveAt : null,
        };
    }

    private static GetCurrentUserResponse ToResponse(User user, UserSettings settings) => new()
    {
        Id = user.Id,
        Name = user.DisplayName,
        Email = user.Email,
        
        // Privacy & Sharing
        ShareMood = settings.MoodShareDefault,
        ShareActivity = settings.ShareActivity,
        ShareCheckIns = settings.ShareCheckIns,
        ShareLocation = settings.ShareLocation,
        ShareTimeline = settings.ShareTimeline,
        
        // Permissions
        AllowHugs = settings.AllowHugs,
        AllowEmergencyAlerts = settings.AllowEmergencyAlerts,
        AllowPartnerReminders = settings.AllowPartnerReminders,
        
        // Notifications
        NotificationsEnabled = settings.NotificationsEnabled,
        HugNotifications = settings.HugNotifications,
        EmergencyNotifications = settings.EmergencyNotifications,
        CheckInReminders = settings.CheckInReminders,
        PartnerActivityNotifications = settings.PartnerActivityNotifications,
        DailyDigest = settings.DailyDigest,
        
        // App Preferences
        SoundEnabled = settings.SoundEnabled,
        VibrationEnabled = settings.VibrationEnabled,
    };

    // UserSettings rows may not exist for users created before settings were
    // introduced (only the seeder created them). Create a default row on demand.
    private async Task<UserSettings> GetOrCreateSettingsAsync(Guid userId, CancellationToken ct)
    {
        var settings = await db.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId, ct);
        if (settings != null) return settings;

        settings = new UserSettings { UserId = userId };
        db.UserSettings.Add(settings);
        // Saved by the caller alongside any other changes.
        return settings;
    }
}
