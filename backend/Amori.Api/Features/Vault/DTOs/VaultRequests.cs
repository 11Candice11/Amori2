namespace Amori.Api.Features.Vault.DTOs;

/// <summary>
/// Save one of the relationship's memories into the caller's own vault.
///
/// Only the reference is accepted. The gift's title, description, date and
/// location are read from the memory server-side, so a client can't fabricate
/// gift content or save a memory it isn't entitled to see.
/// </summary>
public sealed class SaveVaultGiftRequest
{
    public Guid MemoryId { get; set; }

    /// <summary>The collectible card art the gift arrived in (1-10).</summary>
    public int CardNumber { get; set; }
}
