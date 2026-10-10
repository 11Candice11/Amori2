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

    // Navigation
    public User User { get; set; } = null!;
}
