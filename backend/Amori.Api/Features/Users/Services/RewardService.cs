using Amori.Api.Common.Responses;
using Amori.Api.Common.Time;

namespace Amori.Api.Features.Users.Services;

/// <summary>
/// Grants rewards in its own service scope, isolated from the request that
/// triggered it.
///
/// The isolation is the point. A reward is granted after the feature's own
/// transaction has committed, and if awarding then fails — a race on the
/// once-a-day guard, a transient database error — that failure must not reach
/// the caller. Sharing the request's <c>DbContext</c> would break that: a
/// failed <c>SaveChangesAsync</c> leaves entries in the change tracker that
/// poison any later save in the same request. A separate scope means the worst
/// case is a lost reward, not a failed hug.
/// </summary>
public sealed class RewardService(
    IServiceScopeFactory scopeFactory,
    IClientLocalTimeAccessor localTime,
    ILogger<RewardService> logger) : IRewardService
{
    public async Task<RewardsResponse> GrantAsync(
        Guid userId, RewardRequest request, CancellationToken ct = default)
    {
        if (request.ActivityType is null) return RewardsResponse.None;

        // Captured before we leave the request scope — the accessor is scoped,
        // and the child scope would resolve a fresh one with no headers.
        var clientLocalTime = localTime.Current;

        try
        {
            using var scope = scopeFactory.CreateScope();
            var points = scope.ServiceProvider.GetRequiredService<IPointsService>();

            var result = await points.AwardAsync(
                userId,
                request.ActivityType.Value,
                clientLocalTime,
                request.OncePerLocalDay,
                request.ReferenceId,
                request.Metadata,
                ct);

            if (!result.Awarded) return RewardsResponse.None;

            return new RewardsResponse
            {
                PointsAwarded = result.PointsAwarded,
                TotalPoints = result.TotalPoints,
                LeveledUp = result.LeveledUp,
                NewLevel = result.LeveledUp ? result.NewLevel : null,
                // Badge awarding slots in here once the catalogue lands; the
                // response shape is already final so no DTO changes then.
                NewBadges = [],
            };
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // The client gave up on the request; not worth logging as a fault.
            return RewardsResponse.None;
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Failed to grant {Activity} to user {UserId}; the originating action is unaffected.",
                request.ActivityType, userId);

            return RewardsResponse.None;
        }
    }
}
