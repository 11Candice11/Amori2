namespace Amori.Api.Features.WeeklyReflection.DTOs;

/// <summary>
/// A kept weekly reflection, returned to its owner. The snapshot is the frozen
/// view-model the client sent at save time, handed back unchanged so the week
/// renders exactly as it did when saved.
/// </summary>
public sealed class WeeklyReflectionArchiveResponse
{
    /// <summary>The week's Monday as "YYYY-MM-DD" — the archive's stable key.</summary>
    public string WeekKey { get; init; } = string.Empty;

    public string RangeLabel { get; init; } = string.Empty;

    /// <summary>When the snapshot was saved (UTC).</summary>
    public DateTime SavedAt { get; init; }

    /// <summary>Whether the mood picture was partial when saved.</summary>
    public bool MoodDataPartial { get; init; }

    public WeeklyReflectionSnapshotDto Snapshot { get; init; } = new();
}

public sealed class WeeklyReflectionSnapshotDto
{
    public List<WeeklyReflectionDayDto> Days { get; init; } = [];
    public int CheckInDays { get; init; }
    public WeeklyReflectionDistributionDto Distribution { get; init; } = new();
    public string? DominantQuadrant { get; init; }
    public int DominantCount { get; init; }
    public int MemoryCount { get; init; }
    public List<WeeklyReflectionMemoryThumbDto> MemoryThumbs { get; init; } = [];
    public int HugsSent { get; init; }
    public int HugsReceived { get; init; }
    public List<WeeklyReflectionMilestoneDto> Milestones { get; init; } = [];
    public bool IsEmpty { get; init; }
}

public sealed class WeeklyReflectionDayDto
{
    public int DayIndex { get; init; }
    public string Date { get; init; } = string.Empty;
    public int DayOfMonth { get; init; }
    public bool HasCheckIn { get; init; }
    public string? Quadrant { get; init; }
    public string? Label { get; init; }
}

public sealed class WeeklyReflectionDistributionDto
{
    public int HIGH_PLEASANT { get; init; }
    public int LOW_PLEASANT { get; init; }
    public int HIGH_UNPLEASANT { get; init; }
    public int LOW_UNPLEASANT { get; init; }
}

public sealed class WeeklyReflectionMemoryThumbDto
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? ThumbnailUrl { get; init; }
    public string? CreatedByName { get; init; }
    public string MemoryDateTime { get; init; } = string.Empty;
}

public sealed class WeeklyReflectionMilestoneDto
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Kind { get; init; } = string.Empty;
    public string When { get; init; } = string.Empty;
    public string Source { get; init; } = string.Empty;
}
