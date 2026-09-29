using Amori.Api.Domain.Enums;

namespace Amori.Api.Domain.Entities;

/// <summary>
/// A single thing the couple wants to build, experience, achieve or dream about
/// together. Belongs to the shared relationship (never to a single partner's
/// private profile) and lives in exactly one <see cref="VisionBoardSection"/>.
///
/// Distinct from Memories (things that happened), Timeline (milestones), the
/// Bucket List (actionable items), the Calendar (scheduled events) and the
/// Wishlist (things to purchase): this represents the couple's broader vision.
/// </summary>
public sealed class VisionBoardItem : BaseEntity
{
    public Guid RelationshipId { get; set; }

    /// <summary>The partner who added the item, so the UI can show "Added by you/partner".</summary>
    public Guid CreatedByUserId { get; set; }

    /// <summary>The shelf this item lives on.</summary>
    public Guid SectionId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public VisionBoardItemType Type { get; set; } = VisionBoardItemType.Dream;

    /// <summary>Storage key for the item's image (uploaded via /api/media). Null when none attached.</summary>
    public string? ImageFileKey { get; set; }

    public string? LocationName { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    /// <summary>An aspirational "when", not a scheduled date. Stored as UTC.</summary>
    public DateTime? TargetDate { get; set; }

    public decimal? Budget { get; set; }

    /// <summary>An optional external reference — a link, a note about where it came from, etc.</summary>
    public string? ExternalReference { get; set; }

    public string? Notes { get; set; }

    public bool IsPinned { get; set; }

    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? CompletedNote { get; set; }

    /// <summary>Position within the section. Lower sorts first (after pinned items).</summary>
    public int SortOrder { get; set; }

    public bool IsDeleted { get; set; }

    // Navigation
    public Relationship Relationship { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
    public VisionBoardSection Section { get; set; } = null!;
}
