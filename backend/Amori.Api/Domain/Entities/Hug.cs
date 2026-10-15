namespace Amori.Api.Domain.Entities;

public sealed class Hug : BaseEntity
{
    public Guid RelationshipId { get; set; }
    public Guid SenderId { get; set; }
    public Guid RecipientId { get; set; }

    /// <summary>Optional short "gentle whisper" the sender attaches to the hug.</summary>
    public string? Whisper { get; set; }

    /// <summary>
    /// How long the sender held the button down, in milliseconds, as reported
    /// by their device. Null when the app didn't say.
    ///
    /// Sending a hug is a press-and-hold gesture, so this distinguishes a
    /// lingering hug from a tap — which is what earns the "hug held" points on
    /// top of the points for sending one at all.
    /// </summary>
    public int? HoldDurationMs { get; set; }

    public DateTime? AcknowledgedAt { get; set; }

    /// <summary>The sender's UTC offset (minutes) when they sent it, if their device reported one.</summary>
    public int? SenderUtcOffsetMinutes { get; set; }

    /// <summary>
    /// The recipient's last known UTC offset (minutes) at send time. When both
    /// offsets are known and differ, the hug crossed time zones.
    /// </summary>
    public int? RecipientUtcOffsetMinutes { get; set; }

    // Navigation
    public Relationship Relationship { get; set; } = null!;
    public User Sender { get; set; } = null!;
    public User Recipient { get; set; } = null!;
}
