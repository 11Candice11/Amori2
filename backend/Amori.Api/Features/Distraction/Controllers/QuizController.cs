using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Distraction.DTOs;
using Amori.Api.Features.Distraction.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Distraction.Controllers;

/// <summary>
/// "About Us" couple quiz — part of the Distraction Centre.
/// </summary>
[ApiController]
[Route("api/quiz")]
[Authorize]
public sealed class QuizController(
    IQuizService quizService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>Get the active quiz questions for the user's relationship.</summary>
    [HttpGet("questions")]
    [ProducesResponseType(typeof(IReadOnlyList<QuizQuestionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQuestions(CancellationToken ct) =>
        Ok(await quizService.GetQuestionsAsync(RequireUserId(), ct));

    /// <summary>Author a new "about us" question for your relationship.</summary>
    [HttpPost("questions")]
    [ProducesResponseType(typeof(QuizQuestionResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateQuestion([FromBody] CreateQuizQuestionRequest req, CancellationToken ct)
    {
        var result = await quizService.CreateQuestionAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetQuestions), null, result);
    }

    /// <summary>Submit answers and record a scored quiz session.</summary>
    [HttpPost("sessions")]
    [ProducesResponseType(typeof(QuizSessionResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Submit([FromBody] SubmitQuizRequest req, CancellationToken ct) =>
        Ok(await quizService.SubmitAsync(RequireUserId(), req, ct));

    /// <summary>Get past quiz sessions for the user's relationship.</summary>
    [HttpGet("history")]
    [ProducesResponseType(typeof(IReadOnlyList<QuizSessionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHistory(CancellationToken ct) =>
        Ok(await quizService.GetHistoryAsync(RequireUserId(), ct));
}
