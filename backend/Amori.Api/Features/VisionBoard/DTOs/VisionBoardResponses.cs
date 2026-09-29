using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.VisionBoard.DTOs;

public sealed class VisionBoardItemResponse
{
    public Guid Id { get; init; }
    public Guid RelationshipId { get; init; }
    public Guid CreatedByUserId { get; init; }
    public string CreatedByName { get; init; } = string.Empty;
    public Guid SectionId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }

    /// <summary>Serialized as the string enum name (e.g. "Place").</summary>
    public VisionBoardItemType Type { get; init; }

    public string? ImageFileKey { get; init; }

    /// <summary>A loadable URL resolved from <see cref="ImageFileKey"/> (may be presigned). Null when no image.</summary>
    public string? ImageUrl { get; init; }

    public string? LocationName { get; init; }
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
    public DateTime? TargetDate { get; init; }
    public decimal? Budget { get; init; }
    public string? ExternalReference { get; init; }
    public string? Notes { get; init; }
    public bool IsPinned { get; init; }
    public bool IsCompleted { get; init; }
    public DateTime? CompletedAt { get; init; }
    public string? CompletedNote { get; init; }
    public int SortOrder { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

public sealed class VisionBoardSectionResponse
{
    public Guid Id { get; init; }
    public Guid RelationshipId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? CoverImageFileKey { get; init; }
    public string? CoverImageUrl { get; init; }
    public int SortOrder { get; init; }
    public bool IsDefault { get; init; }

    /// <summary>Count of active (not completed, not deleted) items on this shelf.</summary>
    public int ItemCount { get; init; }

    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

/// <summary>
/// The whole board in one payload: the ordered sections plus every active and
/// completed item. The client renders sections in order, floats pinned items,
/// then falls back to sort order / newest, and visually separates completed
/// items into an "Achieved" area.
/// </summary>
public sealed class VisionBoardResponse
{
    public IReadOnlyList<VisionBoardSectionResponse> Sections { get; init; } = [];
    public IReadOnlyList<VisionBoardItemResponse> Items { get; init; } = [];
}
