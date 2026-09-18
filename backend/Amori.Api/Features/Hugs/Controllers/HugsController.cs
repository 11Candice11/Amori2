using Amori.Api.Features.Hugs.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Hugs.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Hugs;

/// <summary>Send and receive virtual hugs between partners.</summary>
[ApiController]
[Route("api/hugs")]
[Authorize]
public sealed class HugsController(
    IHugService hugService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>Send a hug to your partner.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(HugResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> SendHug([FromBody] SendHugRequest? request, CancellationToken ct)
    {
        var result = await hugService.SendHugAsync(RequireUserId(), request ?? new SendHugRequest(), ct);
        return CreatedAtAction(nameof(GetHug), new { hugId = result.Id }, result);
    }

    /// <summary>Get all hugs for the authenticated user's relationship.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<HugResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHugs(CancellationToken ct) =>
        Ok(await hugService.GetHugsAsync(RequireUserId(), ct));

    /// <summary>Get a hug by ID.</summary>
    [HttpGet("{hugId:guid}")]
    [ProducesResponseType(typeof(HugResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHug(Guid hugId, CancellationToken ct) =>
        Ok(await hugService.GetHugAsync(RequireUserId(), hugId, ct));

    /// <summary>Acknowledge a received hug.</summary>
    [HttpPost("{hugId:guid}/acknowledge")]
    [ProducesResponseType(typeof(HugResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Acknowledge(Guid hugId, CancellationToken ct) =>
        Ok(await hugService.AcknowledgeAsync(RequireUserId(), hugId, ct));
}
