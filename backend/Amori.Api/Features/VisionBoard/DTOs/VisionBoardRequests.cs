using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.VisionBoard.DTOs;

// ── Items ───────────────────────────────────────────────────────────────────

public sealed class CreateVisionBoardItemRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>The kind of vision. Defaults to Dream when omitted.</summary>
    public VisionBoardItemType Type { get; set; } = VisionBoardItemType.Dream;

    /// <summary>
    /// The section to file this item under. Optional — when omitted the item is
    /// placed in the section matching its <see cref="Type"/> (falling back to the
    /// first section), so a client can create an item without picking a shelf.
    /// </summary>
    public Guid? SectionId { get; set; }

    /// <summary>Storage key from a prior /api/media upload. Attach after upload.</summary>
    public string? ImageFileKey { get; set; }

    public string? LocationName { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTime? TargetDate { get; set; }
    public decimal? Budget { get; set; }
    public string? ExternalReference { get; set; }
    public string? Notes { get; set; }
    public bool IsPinned { get; set; }
}

public sealed class UpdateVisionBoardItemRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public VisionBoardItemType? Type { get; set; }
    public string? ImageFileKey { get; set; }
    public string? LocationName { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTime? TargetDate { get; set; }
    public decimal? Budget { get; set; }
    public string? ExternalReference { get; set; }
    public string? Notes { get; set; }
    public bool? IsPinned { get; set; }
}

public sealed class CompleteVisionBoardItemRequest
{
    /// <summary>An optional note captured at the moment the vision was realised.</summary>
    public string? CompletedNote { get; set; }
}

public sealed class MoveVisionBoardItemRequest
{
    /// <summary>The destination section.</summary>
    public Guid SectionId { get; set; }
}

public sealed class PinVisionBoardItemRequest
{
    public bool IsPinned { get; set; }
}

/// <summary>
/// Reorders items. <see cref="ItemIds"/> is the desired order; the item at index
/// 0 gets the lowest sort order. When <see cref="SectionId"/> is set the reorder
/// is scoped to that section, otherwise it applies across the whole board.
/// </summary>
public sealed class ReorderVisionBoardItemsRequest
{
    public Guid? SectionId { get; set; }
    public List<Guid> ItemIds { get; set; } = [];
}

// ── Sections ──────────────────────────────────────────────────────────────────

public sealed class CreateVisionBoardSectionRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CoverImageFileKey { get; set; }
}

public sealed class UpdateVisionBoardSectionRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? CoverImageFileKey { get; set; }
}

/// <summary>Reorders sections. <see cref="SectionIds"/> is the desired order.</summary>
public sealed class ReorderVisionBoardSectionsRequest
{
    public List<Guid> SectionIds { get; set; } = [];
}
