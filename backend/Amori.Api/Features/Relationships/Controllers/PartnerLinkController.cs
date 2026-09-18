using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Relationships.DTOs;
using Amori.Api.Features.Relationships.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Relationships;

/// <summary>Link two accounts into one couple relationship via email link requests.</summary>
[ApiController]
[Route("api/partner-link")]
[Authorize]
public sealed class PartnerLinkController(
    IPartnerLinkService partnerLinkService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>Get the current user's link status and any pending requests.</summary>
    [HttpGet("status")]
    [ProducesResponseType(typeof(PartnerLinkStatusResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatus(CancellationToken ct) =>
        Ok(await partnerLinkService.GetStatusAsync(RequireUserId(), ct));

    /// <summary>Send a link request to a partner by their account email.</summary>
    [HttpPost("requests")]
    [ProducesResponseType(typeof(PartnerLinkRequestResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> SendRequest([FromBody] SendPartnerLinkRequest request, CancellationToken ct)
    {
        var result = await partnerLinkService.SendRequestAsync(RequireUserId(), request, ct);
        return CreatedAtAction(nameof(GetStatus), new { }, result);
    }

    /// <summary>Accept an incoming link request, merging both accounts into one relationship.</summary>
    [HttpPost("requests/{requestId:guid}/accept")]
    [ProducesResponseType(typeof(RelationshipResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> AcceptRequest(
        Guid requestId,
        [FromBody] AcceptPartnerLinkRequest? request,
        CancellationToken ct) =>
        Ok(await partnerLinkService.AcceptRequestAsync(
            RequireUserId(), requestId, request ?? new AcceptPartnerLinkRequest(), ct));

    /// <summary>Decline an incoming link request.</summary>
    [HttpPost("requests/{requestId:guid}/decline")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeclineRequest(Guid requestId, CancellationToken ct)
    {
        await partnerLinkService.DeclineRequestAsync(RequireUserId(), requestId, ct);
        return NoContent();
    }

    /// <summary>Cancel an outgoing link request.</summary>
    [HttpDelete("requests/{requestId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> CancelRequest(Guid requestId, CancellationToken ct)
    {
        await partnerLinkService.CancelRequestAsync(RequireUserId(), requestId, ct);
        return NoContent();
    }

    /// <summary>Unlink from the current partner, returning the user to a solo relationship.</summary>
    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Unlink(CancellationToken ct)
    {
        await partnerLinkService.UnlinkAsync(RequireUserId(), ct);
        return NoContent();
    }
}
