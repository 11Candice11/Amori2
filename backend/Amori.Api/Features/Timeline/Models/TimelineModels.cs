using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Timeline.Models;

/// <summary>
/// Internal model for grouping timeline events by year.
/// </summary>
public sealed class TimelineYearGroup
{
    public int Year { get; init; }
    public IReadOnlyList<Guid> EventIds { get; init; } = [];
    public int EventCount => EventIds.Count;
}
