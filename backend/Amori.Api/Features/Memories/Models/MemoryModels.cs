namespace Amori.Api.Features.Memories.Models;

/// <summary>
/// Internal model for memory search and filter criteria.
/// </summary>
public sealed class MemoryFilter
{
    public string? Tag { get; init; }
    public DateOnly? FromDate { get; init; }
    public DateOnly? ToDate { get; init; }
    public bool FavoritesOnly { get; init; }
}
