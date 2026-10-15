namespace Amori.Api.Features.Users.Services;

/// <summary>
/// Computes the activity counters a client needs to show badge progress
/// ("5 of 10 hugs sent") and to decide which badges are unlocked.
/// </summary>
public interface IBadgeStatsService
{
    /// <summary>
    /// Get the user's progress counters, keyed by the badge unlock criteria
    /// names used by the client badge registry (for example "hugs_sent").
    ///
    /// Only criteria we can actually measure are returned. A criteria that is
    /// missing from the dictionary means "not tracked yet" — the client hides
    /// the progress bar rather than claiming the user is at zero.
    /// </summary>
    Task<Dictionary<string, int>> GetBadgeStatsAsync(Guid userId, CancellationToken ct = default);
}
