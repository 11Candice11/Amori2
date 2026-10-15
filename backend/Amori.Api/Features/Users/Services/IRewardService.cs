using Amori.Api.Common.Responses;
using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Users.Services;

/// <summary>
/// The one way a feature grants a reward.
///
/// Feature handlers call this *after* their own <c>SaveChangesAsync</c> has
/// succeeded, so a reward is only ever granted for work that actually
/// committed. In return, this service guarantees it will never throw: a
/// failure to award points must not fail the hug, the check-in or the memory
/// that earned them. Failures are logged and the caller gets
/// <see cref="RewardsResponse.None"/>.
///
/// This is the same placement <c>INotificationService</c> already uses —
/// post-save, best-effort, caller-safe — which is why it reads naturally in the
/// handlers rather than looking like a new framework.
/// </summary>
public interface IRewardService
{
    /// <summary>
    /// Grant whatever <paramref name="request"/> describes and report what the
    /// user earned. Safe to call unconditionally; returns
    /// <see cref="RewardsResponse.None"/> when there was nothing to grant.
    /// </summary>
    Task<RewardsResponse> GrantAsync(Guid userId, RewardRequest request, CancellationToken ct = default);
}

/// <summary>
/// What a feature is claiming the user just did.
///
/// Carries the activity rather than an amount: point values are the server's
/// business, so a handler says "they sent a hug", not "give them 10 points".
/// </summary>
public sealed record RewardRequest
{
    /// <summary>The activity to award points for, if any.</summary>
    public ActivityType? ActivityType { get; init; }

    /// <summary>The row this reward relates to (hug id, check-in id, …).</summary>
    public Guid? ReferenceId { get; init; }

    /// <summary>Free-text detail for the audit trail.</summary>
    public string? Metadata { get; init; }

    /// <summary>
    /// Award at most once per the caller's local calendar day. Used by the
    /// daily rituals — check-in, daily gift — so points can't be farmed by
    /// repeating the action, while still resetting when the user's own day does.
    /// </summary>
    public bool OncePerLocalDay { get; init; }

    /// <summary>Convenience for the common "just award this activity" case.</summary>
    public static RewardRequest For(ActivityType activity, Guid? referenceId = null) =>
        new() { ActivityType = activity, ReferenceId = referenceId };

    /// <summary>Convenience for a once-a-day activity.</summary>
    public static RewardRequest Daily(ActivityType activity, Guid? referenceId = null) =>
        new() { ActivityType = activity, ReferenceId = referenceId, OncePerLocalDay = true };
}
