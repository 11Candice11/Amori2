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
}
