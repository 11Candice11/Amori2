namespace Amori.Api.Domain.Entities;

public sealed class UserSettings : BaseEntity
{
    public Guid UserId { get; set; }
    public bool PushNotificationsEnabled { get; set; } = true;
    public bool MoodRemindersEnabled { get; set; } = true;
    public bool PartnerActivityNotifications { get; set; } = true;
    public bool HugNotifications { get; set; } = true;
    public bool EmergencyNotifications { get; set; } = true;
    public bool MessageNotifications { get; set; } = true;
    public bool ReminderNotifications { get; set; } = true;
    public bool ProfileVisible { get; set; } = true;

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

    // Navigation
    public User User { get; set; } = null!;
}
