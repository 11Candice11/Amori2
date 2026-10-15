namespace Amori.Api.Features.Users.DTOs;

/// <summary>
/// Response after adding points to a user.
/// Returns updated points/level and any badges earned as a result.
/// </summary>
public sealed class AddPointsResponse
{
    /// <summary>Points that were awarded.</summary>
    public int PointsAwarded { get; set; }

    /// <summary>Updated total points after this transaction.</summary>
    public int NewTotalPoints { get; set; }

    /// <summary>Updated level after this transaction.</summary>
    public int NewLevel { get; set; }

    /// <summary>Previous level before this transaction.</summary>
    public int PreviousLevel { get; set; }

    /// <summary>True if the user leveled up as a result of this transaction.</summary>
    public bool LeveledUp { get; set; }

    /// <summary>If a new badge was earned, it will be included here.</summary>
    public BadgeResponse? NewBadge { get; set; }

    /// <summary>Updated points progress information.</summary>
    public UserPointsResponse? Points { get; set; }
}
