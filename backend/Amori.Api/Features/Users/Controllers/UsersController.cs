using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Users.DTOs;
using Amori.Api.Features.Users.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Users;

[ApiController]
[Route("api/users")]
[Authorize]
public sealed class UsersController(
    IUserService userService,
    IPointsService pointsService,
    IBadgeStatsService badgeStatsService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    [HttpGet("me")]
    [ProducesResponseType(typeof(GetCurrentUserResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCurrentUser(CancellationToken ct) =>
        Ok(await userService.GetCurrentUserAsync(RequireUserId(), ct));

    /// <summary>Update the user's privacy/sharing preferences.</summary>
    [HttpPatch("me/settings")]
    [ProducesResponseType(typeof(GetCurrentUserResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateSettings(
        [FromBody] UpdateUserSettingsRequest request, CancellationToken ct) =>
        Ok(await userService.UpdateSettingsAsync(RequireUserId(), request, ct));

    /// <summary>Get the partner's presence (respects their "Share activity" setting).</summary>
    [HttpGet("partner-status")]
    [ProducesResponseType(typeof(PartnerStatusResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPartnerStatus(CancellationToken ct) =>
        Ok(await userService.GetPartnerStatusAsync(RequireUserId(), ct));

    /// <summary>Change the signed-in user's password (verifies the current one).</summary>
    [HttpPatch("me/password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        await userService.ChangePasswordAsync(RequireUserId(), request, ct);
        return NoContent();
    }

    // ─── Gamification: Points ────────────────────────────────────────────────

    /// <summary>
    /// Apply a manual points adjustment (support corrections, testing).
    ///
    /// Only <c>ManualAdjustment</c> is accepted. Every other activity earns its
    /// points server-side when the activity actually happens, so that a client
    /// cannot award itself points or decide how many they are worth.
    /// </summary>
    [HttpPost("me/points")]
    [ProducesResponseType(typeof(AddPointsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> AddPoints(
        [FromBody] AddPointsRequest request, CancellationToken ct) =>
        Ok(await pointsService.AddPointsAsync(RequireUserId(), request, ct));

    /// <summary>Get the current user's points and level information.</summary>
    [HttpGet("me/points")]
    [ProducesResponseType(typeof(UserPointsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPoints(CancellationToken ct) =>
        Ok(await pointsService.GetUserPointsAsync(RequireUserId(), ct));

    /// <summary>Get the current user's earned badges.</summary>
    [HttpGet("me/badges")]
    [ProducesResponseType(typeof(List<BadgeResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBadges(CancellationToken ct) =>
        Ok(await pointsService.GetUserBadgesAsync(RequireUserId(), ct));

    /// <summary>
    /// Get the current user's badge progress counters, keyed by unlock criteria
    /// (for example "hugs_sent": 5). Criteria we don't track are omitted.
    /// </summary>
    [HttpGet("me/badge-stats")]
    [ProducesResponseType(typeof(Dictionary<string, int>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBadgeStats(CancellationToken ct) =>
        Ok(await badgeStatsService.GetBadgeStatsAsync(RequireUserId(), ct));

    /// <summary>
    /// Archive a badge to the user's vault (marks it as saved). Accepts a level
    /// badge's id or a catalogue badge's slug, e.g. <c>first_embrace</c>.
    /// </summary>
    [HttpPost("me/badges/{badgeId}/archive")]
    [ProducesResponseType(typeof(BadgeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ArchiveBadge(
        [FromRoute] string badgeId, CancellationToken ct) =>
        Ok(await pointsService.ArchiveBadgeToVaultAsync(RequireUserId(), badgeId, ct));

    /// <summary>
    /// Save several catalogue badges to the vault at once (the "Save all" in the
    /// app's catch-up summary). Unknown or unearned slugs are skipped.
    /// </summary>
    [HttpPost("me/badges/archive-all")]
    [ProducesResponseType(typeof(ArchiveBadgesResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ArchiveBadges(
        [FromBody] ArchiveBadgesRequest request, CancellationToken ct) =>
        Ok(await pointsService.ArchiveCatalogueBadgesAsync(RequireUserId(), request.Slugs, ct));

    /// <summary>
    /// One-off catch-up: credits points for activity from before server-side
    /// awarding. Idempotent; the app calls it on every launch and shows its
    /// "already earned" summary only when <c>firstRun</c> is true.
    /// </summary>
    [HttpPost("me/catch-up")]
    [ProducesResponseType(typeof(CatchUpResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> CatchUp(CancellationToken ct) =>
        Ok(await pointsService.RunHistoryBackfillAsync(RequireUserId(), ct));

    /// <summary>Get the current user's points history (debug/admin).</summary>
    [HttpGet("me/points/history")]
    [ProducesResponseType(typeof(List<PointsHistoryEntryResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPointsHistory(
        CancellationToken ct, [FromQuery] int limit = 50) =>
        Ok(await pointsService.GetPointsHistoryAsync(RequireUserId(), limit, ct));
}
