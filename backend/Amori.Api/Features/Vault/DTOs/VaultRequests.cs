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
