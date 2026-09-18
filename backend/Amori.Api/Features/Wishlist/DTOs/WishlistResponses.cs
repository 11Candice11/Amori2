using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Wishlist.DTOs;

public sealed class WishlistItemResponse
{
    public Guid Id { get; init; }
    public Guid RelationshipId { get; init; }
    public Guid AddedByUserId { get; init; }
    public string AddedByName { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? ImageKey { get; init; }
    public decimal? Price { get; init; }
    public string? Url { get; init; }
    public WishlistPriority Priority { get; init; }
    public string? Notes { get; init; }
    public bool IsPurchased { get; init; }
    public bool IsFavorite { get; init; }
    public DateTime? PurchasedAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
