using Amori.Api.Features.Memories.DTOs;

namespace Amori.Api.Features.Vault.DTOs;

/// <summary>
/// A saved gift, flattened with the memory's or vision board item's current details
/// so the client can render a vault card — including its media (photos, voice note, links)
/// and coordinates — without a second round trip.
///
/// Exactly one of MemoryId or VisionBoardItemId will be populated.
/// </summary>
public sealed class VaultGiftResponse
{
    public Guid Id { get; init; }

    /// <summary>The vault's owner. Always the authenticated caller.</summary>
    public Guid UserId { get; init; }

    /// <summary>The memory ID (null if this is a vision board item gift).</summary>
    public Guid? MemoryId { get; init; }

    /// <summary>The vision board item ID (null if this is a memory gift).</summary>
    public Guid? VisionBoardItemId { get; init; }

    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }

    /// <summary>When the memory happened or the vision's target date (UTC). Null for visions without target date.</summary>
    public DateTime? MemoryDateTime { get; init; }

    public string? Location { get; init; }

    /// <summary>Coordinates of the memory's or vision's location, when one was pinned.</summary>
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }

    /// <summary>Display name of whoever created the original memory or vision.</summary>
    public string CreatedByName { get; init; } = string.Empty;

    public int CardNumber { get; init; }

    /// <summary>When the caller saved this gift to their vault (UTC).</summary>
    public DateTime SavedAt { get; init; }

    /// <summary>
    /// The memory's media (photos, voice note, links), so the vault can show the
    /// same rich content the memory does. Reuses the Memories DTO shape.
    /// Empty for vision board items without images.
    /// </summary>
    public IReadOnlyList<MemoryMediaResponse> Media { get; init; } = [];
}

/// <summary>
/// Confirmation returned after sending a gift to the partner. The partner's
/// vault is private, so the sender never receives the saved gift itself — only
/// an acknowledgement plus who it went to.
/// </summary>
public sealed class SendGiftResult
{
    /// <summary>The memory or vision that was sent.</summary>
    public Guid MemoryId { get; init; }

    /// <summary>The ID of the gift entry in the recipient's vault.</summary>
    public Guid GiftId { get; init; }

    /// <summary>Display name of the partner the gift was delivered to.</summary>
    public string RecipientName { get; init; } = string.Empty;
}
