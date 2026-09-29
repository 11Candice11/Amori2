using Amori.Api.Common.Exceptions;
using Amori.Api.Features.SupportProfile.DTOs;
using Amori.Api.Features.SupportProfile.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.SupportProfile.Controllers;

/// <summary>
/// The personal "Support Preferences" / "How to Know Me" profile. The owner
/// edits their own profile; the linked partner gets a read-only, shared-only
/// projection. Privacy is enforced server-side in the service.
/// </summary>
[ApiController]
[Route("api/support-profile")]
[Authorize]
public sealed class SupportProfileController(
    ISupportProfileService service,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>Get the authenticated user's own profile (created empty on first access).</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(SupportProfileResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMine(CancellationToken ct) =>
        Ok(await service.GetMineAsync(RequireUserId(), ct));

    /// <summary>Update multiple sections of the authenticated user's profile at once.</summary>
    [HttpPatch("me")]
    [ProducesResponseType(typeof(SupportProfileResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateMine([FromBody] UpdateSupportProfileRequest req, CancellationToken ct) =>
        Ok(await service.UpdateMineAsync(RequireUserId(), req, ct));

    /// <summary>Get the linked partner's profile — shared, non-empty fields only.</summary>
    [HttpGet("partner")]
    [ProducesResponseType(typeof(PartnerSupportProfileResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPartner(CancellationToken ct) =>
        Ok(await service.GetPartnerAsync(RequireUserId(), ct));

    // ── Section-scoped partial updates ────────────────────────────────────────

    [HttpPatch("me/who-i-am")]
    [ProducesResponseType(typeof(SupportProfileResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateWhoIAm([FromBody] UpdateWhoIAmRequest req, CancellationToken ct) =>
        Ok(await service.UpdateWhoIAmAsync(RequireUserId(), req, ct));

    [HttpPatch("me/what-i-like")]
    [ProducesResponseType(typeof(SupportProfileResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateWhatILike([FromBody] UpdateWhatILikeRequest req, CancellationToken ct) =>
        Ok(await service.UpdateWhatILikeAsync(RequireUserId(), req, ct));

    [HttpPatch("me/favorites")]
    [ProducesResponseType(typeof(SupportProfileResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateFavorites([FromBody] UpdateFavoritesRequest req, CancellationToken ct) =>
        Ok(await service.UpdateFavoritesAsync(RequireUserId(), req, ct));

    [HttpPatch("me/how-to-help-me")]
    [ProducesResponseType(typeof(SupportProfileResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateHowToHelpMe([FromBody] UpdateHowToHelpMeRequest req, CancellationToken ct) =>
        Ok(await service.UpdateHowToHelpMeAsync(RequireUserId(), req, ct));

    [HttpPatch("me/things-to-know")]
    [ProducesResponseType(typeof(SupportProfileResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateThingsToKnow([FromBody] UpdateThingsToKnowRequest req, CancellationToken ct) =>
        Ok(await service.UpdateThingsToKnowAsync(RequireUserId(), req, ct));

    [HttpPatch("me/boundaries")]
    [ProducesResponseType(typeof(SupportProfileResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateBoundaries([FromBody] UpdateBoundariesRequest req, CancellationToken ct) =>
        Ok(await service.UpdateBoundariesAsync(RequireUserId(), req, ct));

    [HttpPatch("me/little-things")]
    [ProducesResponseType(typeof(SupportProfileResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateLittleThings([FromBody] UpdateLittleThingsRequest req, CancellationToken ct) =>
        Ok(await service.UpdateLittleThingsAsync(RequireUserId(), req, ct));

    /// <summary>
    /// Explicitly tell the linked partner that the profile was updated. This is
    /// the only partner notification the feature sends — field edits do not
    /// notify automatically.
    /// </summary>
    [HttpPost("me/notify-partner")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> NotifyPartner([FromBody] NotifyPartnerRequest req, CancellationToken ct)
    {
        await service.NotifyPartnerAsync(RequireUserId(), req, ct);
        return NoContent();
    }
}
