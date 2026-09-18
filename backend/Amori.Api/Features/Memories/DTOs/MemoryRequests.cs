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
    public string FileKey { get; set; } = string.Empty;
    public MemoryMediaType MediaType { get; set; }
    public int? DurationSeconds { get; set; }
}
