namespace Amori.Api.Common.Responses;

/// <summary>
/// What the caller earned from the action they just performed.
///
/// Attached to the response of every action that can grant something, so the
/// app can show a level-up or a badge the moment it happens rather than
/// discovering it on the next poll.
///
/// Never null on a response that carries it — <see cref="None"/> stands in when
/// nothing was earned, so clients can read <c>rewards.newBadges</c> without
/// null checks.
/// </summary>
public sealed class RewardsResponse
{
    /// <summary>Badges earned by this action. Empty, never null.</summary>
    public IReadOnlyList<EarnedBadgeResponse> NewBadges { get; init; } = [];

    /// <summary>True when this action pushed the user into a new level.</summary>
    public bool LeveledUp { get; init; }

    /// <summary>The level after this action, when it changed.</summary>
    public int? NewLevel { get; init; }

    /// <summary>Points granted by this action. Zero when none were.</summary>
    public int PointsAwarded { get; init; }

    /// <summary>Total points after this action, for an immediate UI update.</summary>
    public int? TotalPoints { get; init; }

    /// <summary>Nothing was earned.</summary>
    public static readonly RewardsResponse None = new();

    /// <summary>True when there is anything worth showing the user.</summary>
    public bool HasAnything => NewBadges.Count > 0 || LeveledUp || PointsAwarded > 0;
}

/// <summary>
/// A badge the user has just earned, in the shape the reward modal needs.
/// Deliberately minimal — the full catalogue entry comes from
/// <c>GET /api/users/me/badges</c>.
/// </summary>
public sealed class EarnedBadgeResponse
{
    /// <summary>Stable identifier, also the key for the bundled artwork.</summary>
    public string Slug { get; init; } = string.Empty;

    public string Title { get; init; } = string.Empty;

    public string Tagline { get; init; } = string.Empty;

    /// <summary>Image basename on the client; may be shared between badges.</summary>
    public string AssetKey { get; init; } = string.Empty;

    public DateTime EarnedAt { get; init; }
}
