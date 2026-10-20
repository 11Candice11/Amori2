using Amori.Api.Common.Responses;
using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Users.DTOs;

/// <summary>
/// Result of <c>POST /api/users/me/catch-up</c>: the one-off credit for
/// activity from before points were awarded server-side.
/// </summary>
public sealed class CatchUpResponse
{
    /// <summary>
    /// True only on the call that actually ran the backfill — the user's first
    /// app open after the update. The app shows its "already earned" summary
    /// only then. False on every later call.
    /// </summary>
    public bool FirstRun { get; init; }

    /// <summary>What was credited, per activity. Empty when nothing was, or on later calls.</summary>
    public IReadOnlyList<BackfillLine> Breakdown { get; init; } = [];

    /// <summary>Points/level change from the backfill, applied by the app like any action's rewards.</summary>
    public RewardsResponse Rewards { get; init; } = RewardsResponse.None;
}

/// <summary>One activity's share of the backfill, e.g. 12 hugs sent → 120 points.</summary>
public sealed class BackfillLine
{
    public ActivityType ActivityType { get; init; }
    public int Count { get; init; }
    public int Points { get; init; }
}

/// <summary>Body of <c>POST /api/users/me/badges/archive-all</c>.</summary>
public sealed class ArchiveBadgesRequest
{
    /// <summary>Catalogue badge slugs to save to the vault.</summary>
    public List<string> Slugs { get; set; } = [];
}

/// <summary>Result of saving several catalogue badges at once.</summary>
public sealed class ArchiveBadgesResponse
{
    /// <summary>Every badge now in the vault from this request (newly saved or already saved).</summary>
    public IReadOnlyList<BadgeResponse> Saved { get; init; } = [];

    /// <summary>Slugs not saved: unknown, or not earned yet.</summary>
    public IReadOnlyList<string> Skipped { get; init; } = [];

    /// <summary>Points earned by the newly saved badges, combined.</summary>
    public RewardsResponse Rewards { get; init; } = RewardsResponse.None;
}
