namespace Amori.Api.Features.Users.DTOs;

/// <summary>
/// Patch request for the user's privacy/sharing preferences. Only the fields
/// that are provided (non-null) are updated.
/// </summary>
public sealed class UpdateUserSettingsRequest
{
    // ─── Privacy & Sharing ──────────────────────────────────────────────────────
    
    /// <summary>Share mood check-ins with the partner.</summary>
    public bool? ShareMood { get; set; }

    /// <summary>Share activity/presence (online) with the partner.</summary>
    public bool? ShareActivity { get; set; }

    /// <summary>Share detailed check-in notes with the partner.</summary>
    public bool? ShareCheckIns { get; set; }

    /// <summary>Share location when sending emergency alerts.</summary>
    public bool? ShareLocation { get; set; }

    /// <summary>Share timeline events with the partner.</summary>
    public bool? ShareTimeline { get; set; }

    // ─── Permissions ────────────────────────────────────────────────────────────
    
    /// <summary>Allow partner to send you hugs.</summary>
    public bool? AllowHugs { get; set; }

    /// <summary>Allow partner to send you emergency alerts.</summary>
    public bool? AllowEmergencyAlerts { get; set; }

    /// <summary>Allow partner to set reminders for you.</summary>
    public bool? AllowPartnerReminders { get; set; }

    // ─── Notifications ──────────────────────────────────────────────────────────
    
    /// <summary>Master toggle for all notifications.</summary>
    public bool? NotificationsEnabled { get; set; }

    /// <summary>Receive notifications when partner sends a hug.</summary>
    public bool? HugNotifications { get; set; }

    /// <summary>Receive emergency alert notifications.</summary>
    public bool? EmergencyNotifications { get; set; }

    /// <summary>Receive reminders to complete check-ins.</summary>
    public bool? CheckInReminders { get; set; }

    /// <summary>Daily check-in reminder time in 24-hour format "HH:MM".</summary>
    public string? CheckInReminderTime { get; set; }

    /// <summary>Get notified when partner is active.</summary>
    public bool? PartnerActivityNotifications { get; set; }

    /// <summary>Receive a daily digest of activities.</summary>
    public bool? DailyDigest { get; set; }

    // ─── App Preferences ────────────────────────────────────────────────────────
    
    /// <summary>Enable sound effects in the app.</summary>
    public bool? SoundEnabled { get; set; }

    /// <summary>Enable vibration feedback.</summary>
    public bool? VibrationEnabled { get; set; }
}
