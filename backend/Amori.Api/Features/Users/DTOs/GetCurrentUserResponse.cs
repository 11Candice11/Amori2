namespace Amori.Api.Features.Users.DTOs;

public sealed class GetCurrentUserResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    // ─── Privacy & Sharing ──────────────────────────────────────────────────────
    
    /// <summary>Privacy: share mood check-ins with the partner.</summary>
    public bool ShareMood { get; set; } = true;

    /// <summary>Privacy: share activity/presence (online) with the partner.</summary>
    public bool ShareActivity { get; set; } = true;

    /// <summary>Privacy: share detailed check-ins with the partner.</summary>
    public bool ShareCheckIns { get; set; } = true;

    /// <summary>Privacy: share location when sending emergency alerts.</summary>
    public bool ShareLocation { get; set; } = true;

    /// <summary>Privacy: share timeline events with the partner.</summary>
    public bool ShareTimeline { get; set; } = true;

    // ─── Permissions ────────────────────────────────────────────────────────────
    
    /// <summary>Privacy: allow partner to send you hugs.</summary>
    public bool AllowHugs { get; set; } = true;

    /// <summary>Privacy: allow partner to send you emergency alerts.</summary>
    public bool AllowEmergencyAlerts { get; set; } = true;

    /// <summary>Privacy: allow partner to set reminders for you.</summary>
    public bool AllowPartnerReminders { get; set; } = true;

    // ─── Notifications ──────────────────────────────────────────────────────────
    
    /// <summary>Notifications: master toggle for all notifications.</summary>
    public bool NotificationsEnabled { get; set; } = true;

    /// <summary>Notifications: receive notifications when partner sends a hug.</summary>
    public bool HugNotifications { get; set; } = true;

    /// <summary>Notifications: receive emergency alert notifications.</summary>
    public bool EmergencyNotifications { get; set; } = true;

    /// <summary>Notifications: receive reminders to complete check-ins.</summary>
    public bool CheckInReminders { get; set; } = true;

    /// <summary>Notifications: daily check-in reminder time in 24-hour format "HH:MM".</summary>
    public string CheckInReminderTime { get; set; } = "09:00";

    /// <summary>Notifications: get notified when partner is active.</summary>
    public bool PartnerActivityNotifications { get; set; } = true;

    /// <summary>Notifications: receive a daily digest of activities.</summary>
    public bool DailyDigest { get; set; } = true;

    // ─── App Preferences ────────────────────────────────────────────────────────
    
    /// <summary>App settings: enable sound effects.</summary>
    public bool SoundEnabled { get; set; } = true;

    /// <summary>App settings: enable vibration feedback.</summary>
    public bool VibrationEnabled { get; set; } = true;

    // ─── Gamification ───────────────────────────────────────────────────────────
    
    /// <summary>Gamification: current points and level information.</summary>
    public UserPointsResponse? Points { get; set; }

    /// <summary>Gamification: list of earned badges not yet archived to vault.</summary>
    public List<BadgeResponse> EarnedBadges { get; set; } = [];
}
