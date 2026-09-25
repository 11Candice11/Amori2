namespace Amori.Api.Domain.Entities;

public sealed class UserSettings : BaseEntity
{
    public Guid UserId { get; set; }
    
    // ─── Legacy Notification Settings ──────────────────────────────────────────
    // These are kept for backwards compatibility but may be consolidated later
    public bool PushNotificationsEnabled { get; set; } = true;
    public bool MoodRemindersEnabled { get; set; } = true;
    public bool MessageNotifications { get; set; } = true;
    public bool ReminderNotifications { get; set; } = true;
    public bool ProfileVisible { get; set; } = true;

    // ─── Privacy & Sharing ──────────────────────────────────────────────────────
    
    /// <summary>
    /// When true, mood check-ins are shared with the partner by default and the
    /// partner can see the user's current mood. Acts as the global "Share mood"
    /// privacy switch.
    /// </summary>
    public bool MoodShareDefault { get; set; } = true;

    /// <summary>
    /// When true, the user's activity/presence (online / in the app) is visible
    /// to their partner. The global "Share activity" privacy switch.
    /// </summary>
    public bool ShareActivity { get; set; } = true;

    /// <summary>Share detailed check-in notes with the partner.</summary>
    public bool ShareCheckIns { get; set; } = true;

    /// <summary>Share location when sending emergency alerts.</summary>
    public bool ShareLocation { get; set; } = true;

    /// <summary>Share timeline events with the partner.</summary>
    public bool ShareTimeline { get; set; } = true;

    // ─── Permissions ────────────────────────────────────────────────────────────
    
    /// <summary>Allow partner to send you hugs.</summary>
    public bool AllowHugs { get; set; } = true;

    /// <summary>Allow partner to send you emergency alerts.</summary>
    public bool AllowEmergencyAlerts { get; set; } = true;

    /// <summary>Allow partner to set reminders for you.</summary>
    public bool AllowPartnerReminders { get; set; } = true;

    // ─── Notifications ──────────────────────────────────────────────────────────
    
    /// <summary>Master toggle for all notifications. When false, all notifications are disabled.</summary>
    public bool NotificationsEnabled { get; set; } = true;

    /// <summary>Receive notifications when partner sends a hug.</summary>
    public bool HugNotifications { get; set; } = true;

    /// <summary>Receive emergency alert notifications.</summary>
    public bool EmergencyNotifications { get; set; } = true;

    /// <summary>Receive reminders to complete check-ins.</summary>
    public bool CheckInReminders { get; set; } = true;

    /// <summary>Get notified when partner is active.</summary>
    public bool PartnerActivityNotifications { get; set; } = true;

    /// <summary>Receive a daily digest of activities.</summary>
    public bool DailyDigest { get; set; } = true;

    // ─── App Preferences ────────────────────────────────────────────────────────
    
    /// <summary>Enable sound effects in the app.</summary>
    public bool SoundEnabled { get; set; } = true;

    /// <summary>Enable vibration feedback.</summary>
    public bool VibrationEnabled { get; set; } = true;

    // Navigation
    public User User { get; set; } = null!;
}
