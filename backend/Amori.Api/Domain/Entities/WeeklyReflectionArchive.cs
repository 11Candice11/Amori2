using Amori.Api.Domain.ValueObjects;

namespace Amori.Api.Domain.Entities;

/// <summary>
/// A kept ("archived") weekly reflection — a frozen Monday–Sunday retrospective
/// the user chose to save so it can be revisited exactly as it was.
///
/// Like the Hearth Vault, this is PRIVATE per-user data rather than shared
/// across the relationship: keeping a reflection is a personal act, so the
/// entity hangs off <see cref="UserId"/> and carries no RelationshipId.
///
/// Unlike the vault (which stores only a memory reference and re-reads the live
/// memory), a reflection is a point-in-time SNAPSHOT — the whole computed
/// view-model is copied into <see cref="Snapshot"/> so it never drifts as the
/// underlying moods/memories change. The snapshot is opaque display data,
/// stored as a single jsonb column.
///
/// <see cref="WeekKey"/> (the week's Monday, "YYYY-MM-DD") is unique per user,
/// so re-saving a week overwrites its snapshot rather than duplicating it.
/// </summary>
public sealed class WeeklyReflectionArchive : BaseEntity
{
    /// <summary>The owner. The only user who may read or delete this entry.</summary>
    public Guid UserId { get; set; }

    /// <summary>The week's Monday as "YYYY-MM-DD". Unique per user.</summary>
    public string WeekKey { get; set; } = string.Empty;

    /// <summary>Human label for the week, e.g. "October 12 – 18, 2026".</summary>
    public string RangeLabel { get; set; } = string.Empty;

    /// <summary>
    /// Whether the mood picture was partial when saved (the mood history
    /// backend gap). Preserved so an old snapshot doesn't misrepresent itself.
    /// </summary>
    public bool MoodDataPartial { get; set; }

    /// <summary>The frozen reflection view-model (jsonb).</summary>
    public WeeklyReflectionSnapshot Snapshot { get; set; } = new();

    // Navigation
    public User User { get; set; } = null!;
}
