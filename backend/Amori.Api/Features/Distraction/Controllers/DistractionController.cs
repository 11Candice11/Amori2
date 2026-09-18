using Amori.Api.Features.Distraction.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Distraction.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Distraction.Controllers;

/// <summary>
/// Distraction Centre — browse games, start sessions, record scores.
/// Game state for 2048 etc. is managed client-side; this stores sessions and scores only.
/// </summary>
[ApiController]
[Route("api/games")]
[Authorize]
public sealed class DistractionController(
    IDistractionService distractionService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>List all available games.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<GameResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGames(CancellationToken ct) =>
        Ok(await distractionService.GetGamesAsync(ct));

    /// <summary>Get a game by ID.</summary>
    [HttpGet("{gameId:guid}")]
    [ProducesResponseType(typeof(GameResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGame(Guid gameId, CancellationToken ct) =>
        Ok(await distractionService.GetGameAsync(gameId, ct));

    /// <summary>Start a game session.</summary>
    [HttpPost("{gameId:guid}/sessions")]
    [ProducesResponseType(typeof(GameSessionResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> StartSession(Guid gameId, CancellationToken ct)
    {
        var result = await distractionService.StartSessionAsync(RequireUserId(), gameId, ct);
        return CreatedAtAction(nameof(GetGame), new { gameId }, result);
    }

    /// <summary>Complete a game session and record the score.</summary>
    [HttpPost("sessions/{sessionId:guid}/complete")]
    [ProducesResponseType(typeof(GameSessionResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> CompleteSession(Guid sessionId, [FromBody] CompleteGameSessionRequest req, CancellationToken ct) =>
        Ok(await distractionService.CompleteSessionAsync(RequireUserId(), sessionId, req, ct));

    /// <summary>Get game session history for the authenticated user's relationship.</summary>
    [HttpGet("history")]
    [ProducesResponseType(typeof(IReadOnlyList<GameSessionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHistory(CancellationToken ct) =>
        Ok(await distractionService.GetHistoryAsync(RequireUserId(), ct));
}
