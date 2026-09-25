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
    public decimal? Price { get; set; }
    public string? Url { get; set; }
    public WishlistPriority? Priority { get; set; }
    public string? Notes { get; set; }
    public bool? IsPurchased { get; set; }
    public bool? IsFavorite { get; set; }
}
