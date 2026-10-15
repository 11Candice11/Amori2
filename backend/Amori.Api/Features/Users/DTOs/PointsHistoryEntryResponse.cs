namespace Amori.Api.Features.Users.DTOs;
using Amori.Api.Domain.Enums;

/// <summary>
/// One line of the points audit trail.
/// GET /api/users/me/points/history
/// </summary>
public sealed class PointsHistoryEntryResponse
{
    public Guid Id { get; set; }

    /// <summary>What earned the points, as its enum name (e.g. "HugSent").</summary>
    public ActivityType ActivityType { get; set; }

    /// <summary>Points granted by this entry. Negative for a correction.</summary>
    public int PointsAwarded { get; set; }

    /// <summary>Running total immediately after this entry.</summary>
    public int TotalPointsAfter { get; set; }

    /// <summary>
    /// The calendar date on the user's own device when this was earned. This is
    /// what the once-a-day rules are enforced against — <see cref="CreatedAt"/>
    /// is UTC and can fall on a different day.
    /// </summary>
    public DateOnly? LocalDate { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? Metadata { get; set; }
}
