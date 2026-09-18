using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Distraction.DTOs;
using Amori.Api.Features.Distraction.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Distraction.Controllers;

/// <summary>
/// "Would You Rather" — playful either/or prompts, part of the Distraction Centre.
/// </summary>
[ApiController]
[Route("api/would-you-rather")]
[Authorize]
public sealed class WouldYouRatherController(
    IWouldYouRatherService wyrService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>Get the active prompts plus this couple's choices so far.</summary>
    [HttpGet("questions")]
    [ProducesResponseType(typeof(IReadOnlyList<WouldYouRatherQuestionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQuestions(CancellationToken ct) =>
        Ok(await wyrService.GetQuestionsAsync(RequireUserId(), ct));

    /// <summary>Author a new either/or prompt for your relationship.</summary>
    [HttpPost("questions")]
    [ProducesResponseType(typeof(WouldYouRatherQuestionResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateQuestion([FromBody] CreateWouldYouRatherRequest req, CancellationToken ct)
    {
        var result = await wyrService.CreateQuestionAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetQuestions), null, result);
    }

    /// <summary>Record (or update) the current user's choice for a prompt.</summary>
    [HttpPost("questions/{questionId:guid}/answer")]
    [ProducesResponseType(typeof(WouldYouRatherQuestionResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Answer(Guid questionId, [FromBody] SubmitWouldYouRatherRequest req, CancellationToken ct) =>
        Ok(await wyrService.AnswerAsync(RequireUserId(), questionId, req, ct));
}
