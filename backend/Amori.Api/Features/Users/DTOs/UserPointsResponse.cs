namespace Amori.Api.Features.Users.DTOs;

/// <summary>
/// Response containing the user's current points and level information.
/// Returned by GET /api/users/me and included in GetCurrentUserResponse.
/// </summary>
public sealed class UserPointsResponse
{
    /// <summary>Total points accumulated across all activities.</summary>
    public int TotalPoints { get; set; }

    /// <summary>Current level calculated from total points.</summary>
    public int Level { get; set; }

    /// <summary>Points earned in the current level (total points - previous levels' points).</summary>
    public int PointsInCurrentLevel { get; set; }

    /// <summary>Points needed to reach the next level (level × 100).</summary>
    public int PointsNeededForLevel { get; set; }

    /// <summary>Progress percentage (0-100) toward the next level.</summary>
    public int ProgressPercentage { get; set; }
}
