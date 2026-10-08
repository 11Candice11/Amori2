namespace Amori.Api.Domain.Entities;

/// <summary>
/// A memory or vision board item the user chose to keep from their daily artifact — their "Hearth Vault".
///
/// Unlike most of the app's data, a vault gift is private to one person rather
/// than shared across the relationship: saving a gift is a personal act, and a
/// partner must not be able to see what the other has kept. That is why this
/// entity hangs off <see cref="UserId"/> and carries no RelationshipId.
///
/// Only the reference is stored, not a copy of the memory's or vision's text. The item
/// itself is already visible to both partners, so there is nothing to gain from
/// duplicating it, and a copy would drift out of date whenever the item is
/// edited. <see cref="BaseEntity.CreatedAt"/> is the "saved at" timestamp.
///
/// Each gift must reference either a Memory OR a VisionBoardItem (but not both).
/// </summary>
public sealed class VaultGift : BaseEntity
{
    /// <summary>The owner of the vault. The only user who may read this entry.</summary>
    public Guid UserId { get; set; }

    /// <summary>The memory that was given as the daily gift (null if this is a vision board gift).</summary>
    public Guid? MemoryId { get; set; }

    /// <summary>The vision board item that was given as the daily gift (null if this is a memory gift).</summary>
    public Guid? VisionBoardItemId { get; set; }

    /// <summary>The collectible card art (1-10) this gift arrived in.</summary>
    public int CardNumber { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public Memory? Memory { get; set; }
    public VisionBoardItem? VisionBoardItem { get; set; }
}
