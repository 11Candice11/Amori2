namespace Amori.Api.Features.Notifications;

/// <summary>
/// The canonical <c>notificationType</c> values passed to
/// <see cref="Services.INotificationService.CreateAsync"/>.
///
/// These strings are persisted on <c>AppNotification.NotificationType</c>, sent
/// to the client in the push payload as <c>data.type</c>, and are what
/// NotificationService matches on to decide which user preference gates the
/// push. Adding a type here without a case in NotificationService's preference
/// map means it is governed by the master switch only.
/// </summary>
public static class NotificationTypes
{
    public const string Hug = "Hug";
    public const string Emergency = "Emergency";
    public const string Incident = "Incident";

    /// <summary>Partner presence / activity updates.</summary>
    public const string PartnerActivity = "PartnerActivity";

    /// <summary>Your partner sent you a gift to your Hearth Vault.</summary>
    public const string Gift = "Gift";

    /// <summary>Your partner sent you a guided "Let's Chat" message.</summary>
    public const string LetsChat = "LetsChat";

    /// <summary>Your partner added an item to the shared "Us" Vision Board.</summary>
    public const string VisionBoardItemAdded = "VisionBoardItemAdded";

    /// <summary>A shared Vision Board item was marked achieved.</summary>
    public const string VisionBoardItemCompleted = "VisionBoardItemCompleted";

    /// <summary>Nudge to complete a daily mood check-in.</summary>
    public const string CheckInReminder = "CheckInReminder";

    /// <summary>The periodic roll-up of shared activity.</summary>
    public const string DailyDigest = "DailyDigest";

    // Partner link lifecycle. These are transactional rather than "activity",
    // so they are deliberately governed by the master switch only — muting
    // activity updates should not hide an actionable link request.
    public const string PartnerLinkRequest = "PartnerLinkRequest";
    public const string PartnerLinkAccepted = "PartnerLinkAccepted";
    public const string PartnerLinkDeclined = "PartnerLinkDeclined";
    public const string PartnerUnlinked = "PartnerUnlinked";
}
