using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Mood.DTOs;
using Amori.Api.Features.Mood.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Mood;

/// <summary>Mood check-in endpoints for tracking emotional state.</summary>
[ApiController]
[Route("api/moods")]
[Authorize]
public sealed class MoodController(
    IMoodService moodService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>Create a mood check-in.</summary>
    [HttpPost("check-ins")]
    [ProducesResponseType(typeof(CheckInResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateCheckIn([FromBody] CreateCheckInRequest req, CancellationToken ct)
    {
        var result = await moodService.CreateCheckInAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetCheckIn), new { checkInId = result.Id }, result);
    }

    /// <summary>List all check-ins for the authenticated user.</summary>
    [HttpGet("check-ins")]
    [ProducesResponseType(typeof(IReadOnlyList<CheckInResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCheckIns(CancellationToken ct) =>
        Ok(await moodService.GetCheckInsAsync(RequireUserId(), ct));

    /// <summary>Get a single check-in by ID.</summary>
    [HttpGet("check-ins/{checkInId:guid}")]
    [ProducesResponseType(typeof(CheckInResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCheckIn(Guid checkInId, CancellationToken ct) =>
        Ok(await moodService.GetCheckInAsync(RequireUserId(), checkInId, ct));

    /// <summary>Update a check-in.</summary>
    [HttpPatch("check-ins/{checkInId:guid}")]
    [ProducesResponseType(typeof(CheckInResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateCheckIn(Guid checkInId, [FromBody] UpdateCheckInRequest req, CancellationToken ct) =>
        Ok(await moodService.UpdateCheckInAsync(RequireUserId(), checkInId, req, ct));

    /// <summary>Delete a check-in.</summary>
    [HttpDelete("check-ins/{checkInId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteCheckIn(Guid checkInId, CancellationToken ct)
    {
        await moodService.DeleteCheckInAsync(RequireUserId(), checkInId, ct);
        return NoContent();
    }

    /// <summary>Share a check-in with partner.</summary>
    [HttpPost("check-ins/{checkInId:guid}/share")]
    [ProducesResponseType(typeof(CheckInResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Share(Guid checkInId, CancellationToken ct) =>
        Ok(await moodService.ShareCheckInAsync(RequireUserId(), checkInId, ct));

    /// <summary>Unshare a check-in from partner.</summary>
    [HttpPost("check-ins/{checkInId:guid}/unshare")]
    [ProducesResponseType(typeof(CheckInResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Unshare(Guid checkInId, CancellationToken ct) =>
        Ok(await moodService.UnshareCheckInAsync(RequireUserId(), checkInId, ct));

    /// <summary>Get the user's most recent check-in (current mood).</summary>
    [HttpGet("current")]
    [ProducesResponseType(typeof(CheckInResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCurrent(CancellationToken ct)
    {
        var result = await moodService.GetCurrentAsync(RequireUserId(), ct);
        return result is null ? NoContent() : Ok(result);
    }

    /// <summary>Get the partner's most recent shared check-in (their current mood).</summary>
    [HttpGet("partner-current")]
    [ProducesResponseType(typeof(CheckInResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPartnerCurrent(CancellationToken ct)
    {
        var result = await moodService.GetPartnerCurrentAsync(RequireUserId(), ct);
        return result is null ? NoContent() : Ok(result);
    }

    /// <summary>Get the user's mood history (last 30 days).</summary>
    [HttpGet("history")]
    [ProducesResponseType(typeof(IReadOnlyList<CheckInResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHistory(CancellationToken ct) =>
        Ok(await moodService.GetHistoryAsync(RequireUserId(), ct));

    /// <summary>Get mood summary statistics.</summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(MoodSummaryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary(CancellationToken ct) =>
        Ok(await moodService.GetSummaryAsync(RequireUserId(), ct));
}
