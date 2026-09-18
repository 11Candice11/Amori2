namespace Amori.Api.Features.Distraction.DTOs;

// ─── Responses ────────────────────────────────────────────────────────────────

public sealed class QuizQuestionResponse
{
    public Guid Id { get; init; }
    public string QuestionText { get; init; } = string.Empty;
    public IReadOnlyList<string> Options { get; init; } = [];
    /// <summary>Author's user id, or null for a system question.</summary>
    public Guid? CreatedByUserId { get; init; }
    /// <summary>Author's display name, or null for a system question.</summary>
    public string? CreatedByName { get; init; }
    /// <summary>True when the current user authored this question.</summary>
    public bool IsMine { get; init; }
}

public sealed class QuizSessionResponse
{
    public Guid Id { get; init; }
    public int Score { get; init; }
    public int TotalQuestions { get; init; }
    public DateTime? CompletedAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public IReadOnlyList<QuizSessionAnswerResponse> Answers { get; init; } = [];
}

public sealed class QuizSessionAnswerResponse
{
    public Guid QuestionId { get; init; }
    public string QuestionText { get; init; } = string.Empty;
    public string AnswerGiven { get; init; } = string.Empty;
    public string CorrectAnswer { get; init; } = string.Empty;
    public bool IsCorrect { get; init; }
}

// ─── Requests ─────────────────────────────────────────────────────────────────

public sealed class SubmitQuizRequest
{
    public List<SubmitQuizAnswer> Answers { get; set; } = [];
}

public sealed class SubmitQuizAnswer
{
    public Guid QuestionId { get; set; }
    public string AnswerGiven { get; set; } = string.Empty;
}

/// <summary>A partner authoring a new "about us" question for the couple.</summary>
public sealed class CreateQuizQuestionRequest
{
    public string QuestionText { get; set; } = string.Empty;
    public string CorrectAnswer { get; set; } = string.Empty;
    public List<string> Options { get; set; } = [];
}
