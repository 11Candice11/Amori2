using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.DatePlanner.DTOs;

public sealed class CreateDateIdeaRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageKey { get; set; }
    public string? Url { get; set; }
    public DateCategory Category { get; set; }
    public string? Location { get; set; }
    public decimal? EstimatedCost { get; set; }
    public int? DurationMinutes { get; set; }
    public string? Notes { get; set; }
}

public sealed class UpdateDateIdeaRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }

    /// <summary>Null leaves the photo unchanged; a blank value removes it.</summary>
    public string? ImageKey { get; set; }

    /// <summary>Null leaves the link unchanged; a blank value removes it.</summary>
    public string? Url { get; set; }
    public DateCategory? Category { get; set; }
    public string? Location { get; set; }

    /// <summary>Null leaves the cost unchanged (use <see cref="ClearEstimatedCost"/> to remove it). 0 means free.</summary>
    public decimal? EstimatedCost { get; set; }

    /// <summary>True removes the estimated cost. Ignored when <see cref="EstimatedCost"/> is also set.</summary>
    public bool? ClearEstimatedCost { get; set; }
    public int? DurationMinutes { get; set; }
    public string? Notes { get; set; }
    public bool? IsFavorite { get; set; }
    public bool? IsCompleted { get; set; }
}
