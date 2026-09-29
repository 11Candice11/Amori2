namespace Amori.Api.Domain.ValueObjects;

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Reflection snapshot value objects.
//
// A weekly reflection is aggregated client-side from moods, memories, timeline,
// hugs and the bucket list for a Monday–Sunday window. When the user chooses to
// KEEP a week, the client sends the already-computed view-model here to be
// frozen, so it can be reopened later exactly as it was rather than recomputed.
//
// The server treats the snapshot as opaque display data: it stores the shape
// the client sends and hands it back unchanged. The whole snapshot lives in one
// jsonb column (see WeeklyReflectionArchiveConfiguration), matching the
// SupportProfile jsonb approach. All members default to empty so a partial
// snapshot round-trips without error.
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>The frozen weekly-reflection view-model, stored as jsonb.</summary>
public sealed class WeeklyReflectionSnapshot
{
    /// <summary>MON…SUN day cells (length 7 when well-formed).</summary>
    public List<WeeklyReflectionDay> Days { get; set; } = [];

    /// <summary>Days (0–7) with at least one check-in.</summary>
    public int CheckInDays { get; set; }

    /// <summary>Per-quadrant tallies across the week.</summary>
    public WeeklyReflectionDistribution Distribution { get; set; } = new();

    /// <summary>Most frequent quadrant key, or null when none mapped.</summary>
    public string? DominantQuadrant { get; set; }

    /// <summary>How many days the dominant quadrant covered.</summary>
    public int DominantCount { get; set; }

    public int MemoryCount { get; set; }
    public List<WeeklyReflectionMemoryThumb> MemoryThumbs { get; set; } = [];

    public int HugsSent { get; set; }
    public int HugsReceived { get; set; }

    public List<WeeklyReflectionMilestone> Milestones { get; set; } = [];

    /// <summary>True when the week held zero check-ins (drives the empty state).</summary>
    public bool IsEmpty { get; set; }
}

public sealed class WeeklyReflectionDay
{
    public int DayIndex { get; set; }
    /// <summary>ISO instant for the day's local start.</summary>
    public string Date { get; set; } = string.Empty;
    public int DayOfMonth { get; set; }
    public bool HasCheckIn { get; set; }
    /// <summary>Mood quadrant key, or null when no check-in / unmapped.</summary>
    public string? Quadrant { get; set; }
    public string? Label { get; set; }
}

public sealed class WeeklyReflectionDistribution
{
    public int HIGH_PLEASANT { get; set; }
    public int LOW_PLEASANT { get; set; }
    public int HIGH_UNPLEASANT { get; set; }
    public int LOW_UNPLEASANT { get; set; }
}

public sealed class WeeklyReflectionMemoryThumb
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? CreatedByName { get; set; }
    /// <summary>ISO memoryDateTime.</summary>
    public string MemoryDateTime { get; set; } = string.Empty;
}

public sealed class WeeklyReflectionMilestone
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    /// <summary>ISO completion/event date.</summary>
    public string When { get; set; } = string.Empty;
    /// <summary>"timeline" | "bucketList".</summary>
    public string Source { get; set; } = string.Empty;
}
