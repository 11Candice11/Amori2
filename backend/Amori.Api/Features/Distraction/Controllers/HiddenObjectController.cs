using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Distraction.DTOs;
using Amori.Api.Features.Distraction.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Distraction.Controllers;

/// <summary>
/// Couple-authored "spot the hidden object" image puzzles — part of the
/// Distraction Centre. Each partner can create puzzles for the other to solve.
/// </summary>
[ApiController]
[Route("api/hidden-object-puzzles")]
[Authorize]
public sealed class HiddenObjectController(
    IHiddenObjectService hiddenObjectService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>List the couple's hidden-object puzzles.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<HiddenObjectPuzzleResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPuzzles(CancellationToken ct) =>
        Ok(await hiddenObjectService.GetPuzzlesAsync(RequireUserId(), ct));

    /// <summary>Create a hidden-object puzzle for your partner (image uploaded first).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(HiddenObjectPuzzleResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateHiddenObjectPuzzleRequest req, CancellationToken ct)
    {
        var result = await hiddenObjectService.CreatePuzzleAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetPuzzles), null, result);
    }

    /// <summary>Delete a puzzle you created.</summary>
    [HttpDelete("{puzzleId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid puzzleId, CancellationToken ct)
    {
        await hiddenObjectService.DeletePuzzleAsync(RequireUserId(), puzzleId, ct);
        return NoContent();
    }
}
