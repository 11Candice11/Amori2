using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Memories.DTOs;

public sealed class CreateMemoryRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>The kind of memory. Defaults to Everyday when omitted.</summary>
    public MemoryCategory Category { get; set; } = MemoryCategory.Everyday;

    /// <summary>Required. When the memory happened (ISO 8601 date-time).</summary>
    public DateTime? MemoryDateTime { get; set; }
    public string? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public List<string> Tags { get; set; } = [];
}

public sealed class UpdateMemoryRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public MemoryCategory? Category { get; set; }
    public DateTime? MemoryDateTime { get; set; }
    public string? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public List<string>? Tags { get; set; }
}

public sealed class AddMemoryMediaRequest
{
    /// <summary>For Photo/VoiceNote: the storage key from the media upload. For Link: the URL.</summary>
    public string FileKey { get; set; } = string.Empty;
    public MemoryMediaType MediaType { get; set; }

    /// <summary>For VoiceNote: recording length in seconds. Null otherwise.</summary>
    public int? DurationSeconds { get; set; }

    /// <summary>Optional label — the link title, or a caption for a voice note.</summary>
    public string? Title { get; set; }

    /// <summary>Optional preview image URL for links.</summary>
    public string? ThumbnailUrl { get; set; }
}
