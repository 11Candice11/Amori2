using Amori.Api.Features.Emergency.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Emergency.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Emergency;

/// <summary>
/// I'm-not-okay / support request flow.
/// NOT a medical emergency service — this is a communication and support tool.
/// </summary>
[ApiController]
[Route("api/emergency/requests")]
[Authorize]
public sealed class EmergencyController(
    IEmergencyService emergencyService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>Create a support / I'm-not-okay request.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(EmergencyRequestResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateEmergencyRequestDto dto, CancellationToken ct)
    {
        var result = await emergencyService.CreateAsync(RequireUserId(), dto, ct);
        return CreatedAtAction(nameof(GetById), new { requestId = result.Id }, result);
    }

    /// <summary>List all support requests in the authenticated user's relationship.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<EmergencyRequestResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await emergencyService.GetAllAsync(RequireUserId(), ct));

    /// <summary>Get a single support request by ID.</summary>
    [HttpGet("{requestId:guid}")]
    [ProducesResponseType(typeof(EmergencyRequestResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid requestId, CancellationToken ct) =>
        Ok(await emergencyService.GetByIdAsync(RequireUserId(), requestId, ct));

    /// <summary>Update the message on an active support request.</summary>
    [HttpPatch("{requestId:guid}")]
    [ProducesResponseType(typeof(EmergencyRequestResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid requestId, [FromBody] UpdateEmergencyRequestDto dto, CancellationToken ct) =>
        Ok(await emergencyService.UpdateAsync(RequireUserId(), requestId, dto, ct));

    /// <summary>Acknowledge a support request (recipient only).</summary>
    [HttpPost("{requestId:guid}/acknowledge")]
    [ProducesResponseType(typeof(EmergencyRequestResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Acknowledge(Guid requestId, CancellationToken ct) =>
        Ok(await emergencyService.AcknowledgeAsync(RequireUserId(), requestId, ct));

    /// <summary>Resolve a support request.</summary>
    [HttpPost("{requestId:guid}/resolve")]
    [ProducesResponseType(typeof(EmergencyRequestResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Resolve(Guid requestId, CancellationToken ct) =>
        Ok(await emergencyService.ResolveAsync(RequireUserId(), requestId, ct));

    /// <summary>Cancel a support request (sender only).</summary>
    [HttpPost("{requestId:guid}/cancel")]
    [ProducesResponseType(typeof(EmergencyRequestResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(Guid requestId, CancellationToken ct) =>
        Ok(await emergencyService.CancelAsync(RequireUserId(), requestId, ct));
}
