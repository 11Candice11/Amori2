using Amori.Api.Domain.Enums;

namespace Amori.Api.Domain.Entities;

/// <summary>
/// A single "Let's Chat" guided message — one person expressing something to
/// their partner through a structured sentence template.
///
/// Privacy is status-driven, not just relationship-scoped:
/// <list type="bullet">
/// <item>While <see cref="Status"/> is <see cref="ChatMessageStatus.Draft"/> or
/// <see cref="ChatMessageStatus.Private"/>, the row is visible only to its
/// <see cref="SenderId"/> author. It is deliberately excluded from every
/// partner-facing query, so a private draft is never leaked (mirrors the
/// private-per-user intent of <see cref="VaultGift"/>, but the row still carries
/// a <see cref="RelationshipId"/> so it survives partner (re)linking merges).</item>
/// <item>Once <see cref="ChatMessageStatus.Sent"/>/Delivered/Read, it is shared
/// data scoped to <see cref="RelationshipId"/> — visible to exactly the two
/// linked partners, following the same rule as <see cref="Message"/>.</item>
/// </list>
///
/// The individual template answers are kept in <see cref="Answers"/> (a jsonb
/// map of input key → text) so the message can be re-edited step by step, and
/// the flattened <see cref="ComposedMessage"/> is stored alongside so reads
/// never have to re-run template composition.
/// </summary>
public sealed class ChatConversation : BaseEntity
{
    /// <summary>The relationship this message belongs to (shared-data scope key).</summary>
    public Guid RelationshipId { get; set; }

    /// <summary>The author. The only user who may see it while it is a draft/private.</summary>
    public Guid SenderId { get; set; }

    /// <summary>
    /// The intended partner. Null only while the author has no linked partner
    /// yet (a draft composed before linking); required to send.
    /// </summary>
    public Guid? RecipientId { get; set; }

    /// <summary>Which guided sentence template was used.</summary>
    public ChatTemplateType TemplateType { get; set; }

    /// <summary>Lifecycle state — governs visibility (see class remarks).</summary>
    public ChatMessageStatus Status { get; set; } = ChatMessageStatus.Draft;

    /// <summary>
    /// Per-step answers keyed by the template input name (e.g. "feeling",
    /// "situation", "need"). Stored as jsonb. Preserved even after composition
    /// so the author can edit an earlier answer.
    /// </summary>
    public Dictionary<string, string> Answers { get; set; } = new();

    /// <summary>The flattened sentence shown in the preview and to the partner.</summary>
    public string ComposedMessage { get; set; } = string.Empty;

    /// <summary>
    /// True while the message is the author's private draft (Draft/Private). A
    /// convenience mirror of the status for querying/serialization; kept in sync
    /// by the service so partner endpoints can filter on it directly.
    /// </summary>
    public bool IsPrivate { get; set; } = true;

    /// <summary>When the message was sent to the partner, if ever.</summary>
    public DateTime? SentAt { get; set; }

    /// <summary>When the recipient first opened it, if ever.</summary>
    public DateTime? ReadAt { get; set; }

    /// <summary>
    /// When either partner closed the chat as resolved; null while it is still open.
    /// Resolving is kept apart from <see cref="Status"/> on purpose: the delivery
    /// lifecycle (Sent/Read) and the badge counters built on it stay untouched.
    /// </summary>
    public DateTime? ResolvedAt { get; set; }

    /// <summary>Which partner resolved it (the sender or the recipient).</summary>
    public Guid? ResolvedById { get; set; }

    /// <summary>Longest <see cref="Resolution"/> accepted (column length and service check).</summary>
    public const int ResolutionMaxLength = 4000;

    /// <summary>What the partners agreed, written by whoever resolved the chat.</summary>
    public string? Resolution { get; set; }

    // Navigation
    public Relationship Relationship { get; set; } = null!;
    public User Sender { get; set; } = null!;
    public User? Recipient { get; set; }
    public User? ResolvedBy { get; set; }
}
