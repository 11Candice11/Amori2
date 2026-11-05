using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Wishlist.DTOs;

public sealed class CreateWishlistItemRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageKey { get; set; }
    public decimal? Price { get; set; }
    public string? Url { get; set; }
    public WishlistPriority Priority { get; set; } = WishlistPriority.Medium;
    public string? Notes { get; set; }
}

public sealed class UpdateWishlistItemRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? ImageKey { get; set; }

    /// <summary>Null leaves the price unchanged (use <see cref="ClearPrice"/> to remove it). 0 means free.</summary>
    public decimal? Price { get; set; }

    /// <summary>True removes the price. Ignored when <see cref="Price"/> is also set.</summary>
    public bool? ClearPrice { get; set; }
    public string? Url { get; set; }
    public WishlistPriority? Priority { get; set; }
    public string? Notes { get; set; }
    public bool? IsPurchased { get; set; }
    public bool? IsFavorite { get; set; }
}
