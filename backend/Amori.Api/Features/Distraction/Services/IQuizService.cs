using Amori.Api.Features.Distraction.DTOs;

namespace Amori.Api.Features.Distraction.Services;

/// <summary>
/// "About Us" couple quiz — fetch questions and submit a scored session.
/// </summary>
public interface IQuizService
{
    Task<IReadOnlyList<QuizQuestionResponse>> GetQuestionsAsync(Guid userId, CancellationToken ct = default);
    Task<QuizQuestionResponse> CreateQuestionAsync(Guid userId, CreateQuizQuestionRequest request, CancellationToken ct = default);
    Task<QuizSessionResponse> SubmitAsync(Guid userId, SubmitQuizRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<QuizSessionResponse>> GetHistoryAsync(Guid userId, CancellationToken ct = default);
}
