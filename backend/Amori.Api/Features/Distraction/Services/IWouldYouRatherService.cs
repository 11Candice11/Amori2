using Amori.Api.Features.Distraction.DTOs;

namespace Amori.Api.Features.Distraction.Services;

/// <summary>
/// "Would You Rather" — playful either/or prompts for a couple.
/// </summary>
public interface IWouldYouRatherService
{
    Task<IReadOnlyList<WouldYouRatherQuestionResponse>> GetQuestionsAsync(Guid userId, CancellationToken ct = default);
    Task<WouldYouRatherQuestionResponse> CreateQuestionAsync(Guid userId, CreateWouldYouRatherRequest request, CancellationToken ct = default);
    Task<WouldYouRatherQuestionResponse> AnswerAsync(Guid userId, Guid questionId, SubmitWouldYouRatherRequest request, CancellationToken ct = default);
}
