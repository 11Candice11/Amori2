namespace Amori.Api.Domain.Entities;

public sealed class Hug : BaseEntity
{
    public Guid RelationshipId { get; set; }
    public Guid SenderId { get; set; }
    public Guid RecipientId { get; set; }

    /// <summary>Optional short "gentle whisper" the sender attaches to the hug.</summary>
    public string? Whisper { get; set; }

    public DateTime? AcknowledgedAt { get; set; }

    // Navigation
    public Relationship Relationship { get; set; } = null!;
    public User Sender { get; set; } = null!;
    public User Recipient { get; set; } = null!;
}
