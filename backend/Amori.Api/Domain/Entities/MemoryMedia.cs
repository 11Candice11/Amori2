using Amori.Api.Domain.Enums;

namespace Amori.Api.Domain.Entities;

public sealed class MemoryMedia : BaseEntity
{
    public Guid MemoryId { get; set; }
    
    /// <summary>For Photo/VoiceNote: S3 key. For Link: the URL string.</summary>
    public string FileKey { get; set; } = string.Empty;
    
    public MemoryMediaType MediaType { get; set; }
    
    /// <summary>For VoiceNote: duration in seconds. Null for other types.</summary>
    public int? DurationSeconds { get; set; }
    
    /// <summary>Optional display title/label for the attachment (e.g., link title).</summary>
    public string? Title { get; set; }
    
    /// <summary>Optional thumbnail URL for links (e.g., YouTube thumbnail).</summary>
    public string? ThumbnailUrl { get; set; }

    // Navigation
    public Memory Memory { get; set; } = null!;
}
