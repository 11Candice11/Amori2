namespace Amori.Api.Features.WeeklyReflection.DTOs;

/// <summary>
/// Save (or overwrite) a kept weekly reflection. The client sends the
/// already-computed view-model; the server stores it verbatim as a snapshot.
///
/// <see cref="WeekKey"/> (the week's Monday, "YYYY-MM-DD") identifies the week —
/// re-sending the same key overwrites that week's snapshot rather than adding a
/// duplicate. The snapshot is opaque display data owned by the caller.
/// </summary>
public sealed class SaveWeeklyReflectionRequest
{
    public string WeekKey { get; set; } = string.Empty;
    public string RangeLabel { get; set; } = string.Empty;
    public bool MoodDataPartial { get; set; }
    public WeeklyReflectionSnapshotDto Snapshot { get; set; } = new();
}
