namespace Amori.Api.Domain.Entities;

/// <summary>
/// Tracks a user's gamification points and current level.
/// 
/// Points are earned through various activities:
/// - Sending a hug: 10 points
/// - Adding a vision, todo list, or bucket list: 10 points each
/// - Holding a hug: 5 points
/// - Daily check-in: 10 points (once per day)
/// - Completing SOS flow: 20 points
/// - Opening daily gift: 15 points
/// - Collecting cards: variable (cardNumber × 15)
/// 
/// Level calculation: Points needed for level N = N × 100
/// Level 2 needs 200 total points, Level 3 needs 300 total points, etc.
/// </summary>
public sealed class UserPoints : BaseEntity
{
    /// <summary>The user who owns these points.</summary>
    public Guid UserId { get; set; }

    /// <summary>Total points accumulated across all activities.</summary>
    public int TotalPoints { get; set; } = 0;

    /// <summary>Current level calculated from total points. Read-only, computed on the fly.</summary>
    public int Level { get; set; } = 1;

    /// <summary>Last time points were updated.</summary>
    public DateTime? LastPointsAddedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
