using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Wishlist.Models;

/// <summary>
/// Internal model for wishlist summary statistics within a relationship.
/// </summary>
public sealed class WishlistStats
{
    public int Total { get; init; }
    public int Purchased { get; init; }
    public int Remaining { get; init; }
    public IDictionary<string, int> ByPriority { get; init; } = new Dictionary<string, int>();
}
