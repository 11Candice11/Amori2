namespace Amori.Api.Features.Users.Services;
using Amori.Api.Common.Time;
using Amori.Api.Domain.Enums;
using Amori.Api.Features.Users.DTOs;

/// <summary>
/// Business logic for user gamification (points and badges).
/// </summary>
public interface IPointsService
{
    /// <summary>
    /// Award the points for an activity the user has just completed.
    ///
    /// This is the server-side entry point and the only one that should be
    /// used by feature code. The amount comes from the server's own value
    /// table rather than the caller, so points cannot be inflated by a
    /// modified client. Prefer calling it through <see cref="IRewardService"/>,
    /// which adds failure isolation.
    /// </summary>
    /// <param name="localTime">
    /// The caller's local date, used by <paramref name="oncePerLocalDay"/> so a
    /// daily ritual resets when the user's own day does, not when UTC's does.
    /// </param>
    /// <param name="oncePerLocalDay">
    /// Skip the award if this activity has already been credited on the
    /// caller's current local date.
    /// </param>
    Task<PointsAwardResult> AwardAsync(
        Guid userId,
        ActivityType activityType,
        ClientLocalTime localTime,
        bool oncePerLocalDay = false,
        Guid? referenceId = null,
        string? metadata = null,
        CancellationToken ct = default);

    /// <summary>
    /// Apply a manual points adjustment (support, testing, corrections).
    /// Only <see cref="ActivityType.ManualAdjustment"/> is accepted; everything
    /// else is awarded server-side by the feature that earns it.
    /// </summary>
    Task<AddPointsResponse> AddPointsAsync(Guid userId, AddPointsRequest request, CancellationToken ct = default);

    /// <summary>
    /// Get the current user's points and level information.
    /// </summary>
    Task<UserPointsResponse> GetUserPointsAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Get all badges earned by a user.
    /// </summary>
    Task<List<BadgeResponse>> GetUserBadgesAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Archive a badge to the user's vault. <paramref name="badgeKey"/> is a
    /// level badge's id (GUID) or a catalogue badge's slug (e.g.
    /// "first_embrace"). A catalogue badge must already be unlocked, or this
    /// throws a <see cref="Common.Exceptions.ConflictException"/>. Idempotent.
    /// </summary>
    Task<BadgeResponse> ArchiveBadgeToVaultAsync(Guid userId, string badgeKey, CancellationToken ct = default);

    /// <summary>
    /// Credit, once ever, the points for activity from before server-side
    /// awarding (hugs, check-ins, SOS, vision/bucket-list/to-do items, gift
    /// cards), skipping anything already credited. Safe to call on every app
    /// open: only the first call does anything, and only it reports FirstRun.
    /// </summary>
    Task<CatchUpResponse> RunHistoryBackfillAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Save several catalogue badges at once. Earned ones are saved (first
    /// save pays each badge's points, in one transaction); unknown or unearned
    /// slugs are returned as skipped rather than failing the batch.
    /// </summary>
    Task<ArchiveBadgesResponse> ArchiveCatalogueBadgesAsync(
        Guid userId, IReadOnlyCollection<string> slugs, CancellationToken ct = default);

    /// <summary>
    /// Get the points history/audit log for a user (admin/debugging only).
    /// </summary>
    Task<List<PointsHistoryEntryResponse>> GetPointsHistoryAsync(
        Guid userId, int limit = 50, CancellationToken ct = default);
}

/// <summary>
/// Outcome of <see cref="IPointsService.AwardAsync"/>.
/// </summary>
/// <param name="Awarded">
/// False when nothing was granted — an activity with no point value, or a
/// once-a-day activity already credited today. Not an error.
/// </param>
public sealed record PointsAwardResult(
    bool Awarded,
    int PointsAwarded,
    int TotalPoints,
    int PreviousLevel,
    int NewLevel,
    IReadOnlyList<BadgeResponse> NewBadges)
{
    public bool LeveledUp => NewLevel > PreviousLevel;

    public static readonly PointsAwardResult NotAwarded = new(false, 0, 0, 0, 0, []);
}
