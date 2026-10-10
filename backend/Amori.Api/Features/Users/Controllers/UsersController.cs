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

    /// <summary>Add points to the current user for completing an activity.</summary>
    [HttpPost("me/points")]
    [ProducesResponseType(typeof(AddPointsResponse), StatusCodes.Status200OK)]
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

    /// <summary>Archive a badge to the user's vault (marks it as saved).</summary>
    [HttpPost("me/badges/{badgeId}/archive")]
    [ProducesResponseType(typeof(BadgeResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ArchiveBadge(
        [FromRoute] Guid badgeId, CancellationToken ct) =>
        Ok(await pointsService.ArchiveBadgeToVaultAsync(RequireUserId(), badgeId, ct));

    /// <summary>Get the current user's points history (debug/admin).</summary>
    [HttpGet("me/points/history")]
    [ProducesResponseType(typeof(List<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPointsHistory(
        [FromQuery] int limit = 50, CancellationToken ct) =>
        Ok(await pointsService.GetPointsHistoryAsync(RequireUserId(), limit, ct));
}
