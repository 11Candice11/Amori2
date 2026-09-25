using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Memories.DTOs;

public sealed class MemoryMediaResponse
{
    public Guid Id { get; init; }
    public string FileKey { get; init; } = string.Empty;

    /// <summary>
    /// A loadable URL for the media. For Photo/VoiceNote this is resolved from the
    /// storage key (may be presigned / time-limited); for Link it is the link URL.
    /// </summary>
    public string Url { get; init; } = string.Empty;
    public MemoryMediaType MediaType { get; init; }
    public int? DurationSeconds { get; init; }

    /// <summary>Optional display label — the link title, or a caption for a voice note.</summary>
    public string? Title { get; init; }

    /// <summary>Optional preview image URL for links (e.g. a YouTube thumbnail).</summary>
    public string? ThumbnailUrl { get; init; }

    public DateTime CreatedAt { get; init; }
}

public sealed class MemoryResponse
{
    public Guid Id { get; init; }
    public Guid RelationshipId { get; init; }
    public Guid CreatedByUserId { get; init; }
    public string CreatedByName { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }

    /// <summary>Serialized as the integer enum value.</summary>
    public MemoryCategory Category { get; init; }
    public DateTime MemoryDateTime { get; init; }
    public string? Location { get; init; }
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
    public List<string> Tags { get; init; } = [];
    public bool IsFavorite { get; init; }
    public IReadOnlyList<MemoryMediaResponse> Media { get; init; } = [];
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
