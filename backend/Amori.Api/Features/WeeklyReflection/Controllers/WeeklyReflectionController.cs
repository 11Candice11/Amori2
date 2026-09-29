using Amori.Api.Common.Exceptions;
using Amori.Api.Features.WeeklyReflection.DTOs;
using Amori.Api.Features.WeeklyReflection.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.WeeklyReflection.Controllers;

/// <summary>
/// Kept weekly reflections — the caller's own archive of frozen weekly
/// retrospectives.
///
/// Every route reads and writes only the authenticated user's archive, so a
/// partner cannot see or remove what the other has kept. Weeks are addressed by
/// their <c>weekKey</c> (the week's Monday, "YYYY-MM-DD"), which is unique per
/// user — one snapshot per week.
/// </summary>
[ApiController]
[Route("api/weekly-reflections")]
[Authorize]
public sealed class WeeklyReflectionController(
    IWeeklyReflectionArchiveService service,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>Get the caller's kept reflections, newest week first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<WeeklyReflectionArchiveResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await service.GetAllAsync(RequireUserId(), ct));

    /// <summary>Get a single kept reflection by week key.</summary>
    [HttpGet("{weekKey}")]
    [ProducesResponseType(typeof(WeeklyReflectionArchiveResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByWeekKey(string weekKey, CancellationToken ct) =>
        Ok(await service.GetByWeekKeyAsync(RequireUserId(), weekKey, ct));

    /// <summary>Save (or overwrite) the caller's reflection for a week.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(WeeklyReflectionArchiveResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Save([FromBody] SaveWeeklyReflectionRequest req, CancellationToken ct)
    {
        var result = await service.SaveAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetByWeekKey), new { weekKey = result.WeekKey }, result);
    }

    /// <summary>Remove a kept reflection from the caller's archive.</summary>
    [HttpDelete("{weekKey}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Remove(string weekKey, CancellationToken ct)
    {
        await service.RemoveAsync(RequireUserId(), weekKey, ct);
        return NoContent();
    }
}
