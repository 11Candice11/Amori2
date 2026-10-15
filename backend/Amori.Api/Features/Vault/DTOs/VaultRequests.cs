namespace Amori.Api.Features.Vault.DTOs;

/// <summary>
/// Save one of the relationship's memories or vision board items into the caller's own vault.
///
/// Only the reference is accepted. The gift's details (title, description, dates, location)
/// are read from the memory or vision board item server-side, so a client can't fabricate
/// gift content or save an item it isn't entitled to see.
///
/// Exactly one of MemoryId or VisionBoardItemId must be provided.
/// </summary>
public sealed class SaveVaultGiftRequest
{
    /// <summary>The memory ID to save (null if saving a vision board item).</summary>
    public Guid? MemoryId { get; set; }

    /// <summary>The vision board item ID to save (null if saving a memory).</summary>
    public Guid? VisionBoardItemId { get; set; }

    /// <summary>The collectible card art the gift arrived in (1-10).</summary>
    public int CardNumber { get; set; }
}

/// <summary>
/// Create a new gift-only memory and send it directly to the partner's vault in one operation.
/// This creates a memory that only appears in the gift vault, not in the regular memories feed.
/// </summary>
public sealed class CreateGiftRequest
{
    /// <summary>Gift title.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Gift description/note.</summary>
    public string? Description { get; set; }

    /// <summary>Memory category (integer enum value).</summary>
    public int Category { get; set; }

    /// <summary>ISO 8601 date-time when this gift/memory occurred.</summary>
    public DateTime MemoryDateTime { get; set; }

    /// <summary>Location where memory took place.</summary>
    public string? Location { get; set; }

    /// <summary>Latitude of location.</summary>
    public decimal? Latitude { get; set; }

    /// <summary>Longitude of location.</summary>
    public decimal? Longitude { get; set; }

    /// <summary>The card number (1-10) the gift is wrapped in.</summary>
    public int CardNumber { get; set; }

    /// <summary>Media attachments (photos, videos, voice notes, links).</summary>
    public List<CreateGiftMediaRequest> Media { get; set; } = [];
}

/// <summary>
/// Media attachment for a gift being created.
/// </summary>
public sealed class CreateGiftMediaRequest
{
    /// <summary>For Photo/Video/VoiceNote: storage key from media upload. For Link: the URL.</summary>
    public string FileKey { get; set; } = string.Empty;

    /// <summary>Integer enum value for media type (Photo=1, VoiceNote=2, Link=3, Video=4).</summary>
    public int MediaType { get; set; }

    /// <summary>For VoiceNote: recording length in seconds.</summary>
    public int? DurationSeconds { get; set; }

    /// <summary>Optional label — link title or voice note caption.</summary>
    public string? Title { get; set; }

    /// <summary>Optional preview image URL for links.</summary>
    public string? ThumbnailUrl { get; set; }
}
