using Amori.Api.Features.Splitting.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Splitting.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Splitting;

/// <summary>"I'm splitting" emotional grounding flow.</summary>
[ApiController]
[Route("api/splitting/sessions")]
[Authorize]
public sealed class SplittingController(
    ISplittingService splittingService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>Start a new splitting session.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(SplittingSessionResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateSplittingSessionRequest req, CancellationToken ct)
    {
        var result = await splittingService.CreateAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetById), new { sessionId = result.Id }, result);
    }

    /// <summary>
    /// Privacy-safe view of the partner's active grounding session, so both
    /// partners can see a shared self-regulation window and its countdown.
    /// Returns 204 when the partner has no active session.
    /// </summary>
    [HttpGet("partner-active")]
    [ProducesResponseType(typeof(PartnerSplittingWindowResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> GetPartnerActive(CancellationToken ct)
    {
        var result = await splittingService.GetPartnerActiveAsync(RequireUserId(), ct);
        return result is null ? NoContent() : Ok(result);
    }

    [HttpGet("{sessionId:guid}")]
    [ProducesResponseType(typeof(SplittingSessionResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid sessionId, CancellationToken ct) =>
        Ok(await splittingService.GetByIdAsync(RequireUserId(), sessionId, ct));

    /// <summary>List all sessions for the authenticated user.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SplittingSessionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await splittingService.GetAllAsync(RequireUserId(), ct));

    [HttpPatch("{sessionId:guid}")]
    [ProducesResponseType(typeof(SplittingSessionResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid sessionId, [FromBody] UpdateSplittingSessionRequest req, CancellationToken ct) =>
        Ok(await splittingService.UpdateAsync(RequireUserId(), sessionId, req, ct));

    [HttpPost("{sessionId:guid}/complete")]
    [ProducesResponseType(typeof(SplittingSessionResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Complete(Guid sessionId, [FromBody] CompleteSplittingSessionRequest req, CancellationToken ct) =>
        Ok(await splittingService.CompleteAsync(RequireUserId(), sessionId, req, ct));

    [HttpPost("{sessionId:guid}/cancel")]
    [ProducesResponseType(typeof(SplittingSessionResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(Guid sessionId, CancellationToken ct) =>
        Ok(await splittingService.CancelAsync(RequireUserId(), sessionId, ct));
}
