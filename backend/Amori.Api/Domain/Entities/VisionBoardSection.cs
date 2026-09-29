namespace Amori.Api.Domain.Entities;

/// <summary>
/// A shelf on the couple's shared Vision Board. Every relationship gets a set of
/// default sections on first access (Our Dreams, Our Places, …) and may add
/// custom sections. Sections are ordered by <see cref="SortOrder"/>.
/// </summary>
public sealed class VisionBoardSection : BaseEntity
{
    public Guid RelationshipId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Storage key for an optional cover image (uploaded via /api/media).</summary>
    public string? CoverImageFileKey { get; set; }

    /// <summary>Position in the board. Lower sorts first.</summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Marks the built-in default sections seeded for a new relationship. Kept so
    /// the UI can, if it wishes, treat the defaults differently from custom ones.
    /// </summary>
    public bool IsDefault { get; set; }

    public bool IsDeleted { get; set; }

    // Navigation
    public Relationship Relationship { get; set; } = null!;
    public ICollection<VisionBoardItem> Items { get; set; } = [];
}
