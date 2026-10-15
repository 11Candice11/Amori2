namespace Amori.Api.Domain.Entities;
using Amori.Api.Domain.Enums;

/// <summary>
/// Audit log of point transactions. Tracks every time a user earns or loses points,
/// including the activity type, amount, and resulting total.
/// </summary>
public sealed class PointsHistory : BaseEntity
{
    /// <summary>The user who earned/lost the points.</summary>
    public Guid UserId { get; set; }

    /// <summary>The type of activity that earned the points.</summary>
    public ActivityType ActivityType { get; set; }

    /// <summary>Points awarded by this activity (can be negative for manual adjustments).</summary>
    public int PointsAwarded { get; set; }

    /// <summary>Total points after this transaction.</summary>
    public int TotalPointsAfter { get; set; }

    /// <summary>Optional reference to another entity (e.g., the memory that was opened as a gift).</summary>
    public Guid? ReferenceId { get; set; }

    /// <summary>Optional additional data (e.g., card number for card collection).</summary>
    public string? Metadata { get; set; }

    /// <summary>
    /// The calendar date on the user's own device when this was earned.
    ///
    /// Once-a-day rules (the daily check-in, opening the daily gift) are
    /// enforced against this rather than <see cref="BaseEntity.CreatedAt"/>,
    /// which is UTC and routinely falls on a different day to the one the user
    /// is looking at. Stored rather than derived because the user's UTC offset
    /// can change between two awards — travel, or daylight saving — and
    /// converting an old timestamp through a new offset lands on the wrong day.
    ///
    /// Null for rows written before this column existed.
    /// </summary>
    public DateOnly? LocalDate { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
