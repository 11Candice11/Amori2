using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Features.Distraction.DTOs;
using Amori.Api.Infrastructure.Relationships;
using Microsoft.EntityFrameworkCore;

namespace Amori.Api.Features.Distraction.Services;

public sealed class QuizService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess) : IQuizService
{
    /// <summary>
    /// Returns active questions scoped to the user's relationship, plus any
    /// global questions (RelationshipId == null).
    /// </summary>
    public async Task<IReadOnlyList<QuizQuestionResponse>> GetQuestionsAsync(Guid userId, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId);
        var relId = rel?.Id;

        var questions = await db.QuizQuestions
            .Include(q => q.CreatedBy)
            .Where(q => q.IsActive && (q.RelationshipId == null || q.RelationshipId == relId))
            .OrderBy(q => q.CreatedAt)
            .ToListAsync(ct);

        return questions.Select(q => MapQuestion(q, userId)).ToList();
    }

    public async Task<QuizQuestionResponse> CreateQuestionAsync(Guid userId, CreateQuizQuestionRequest request, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        var text = request.QuestionText?.Trim() ?? string.Empty;
        var correct = request.CorrectAnswer?.Trim() ?? string.Empty;
        var options = request.Options?
            .Select(o => o?.Trim() ?? string.Empty)
            .Where(o => o.Length > 0)
            .Distinct()
            .ToList() ?? [];

        if (text.Length == 0) throw new ValidationException("A question is required.");
        if (correct.Length == 0) throw new ValidationException("A correct answer is required.");
        if (options.Count < 2) throw new ValidationException("Provide at least two options.");
        if (!options.Contains(correct, StringComparer.OrdinalIgnoreCase))
            throw new ValidationException("The correct answer must be one of the options.");

        var question = new QuizQuestion
        {
            RelationshipId = rel.Id,
            CreatedByUserId = userId,
            QuestionText = text,
            CorrectAnswer = correct,
            Options = options,
            IsActive = true,
        };
        db.QuizQuestions.Add(question);
        await db.SaveChangesAsync(ct);

        question.CreatedBy = await db.Users.FindAsync([userId], ct);
        return MapQuestion(question, userId);
    }

    public async Task<QuizSessionResponse> SubmitAsync(Guid userId, SubmitQuizRequest request, CancellationToken ct = default)
    {
        if (request.Answers.Count == 0)
            throw new ValidationException("At least one answer is required.");

        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        var questionIds = request.Answers.Select(a => a.QuestionId).Distinct().ToList();
        var questions = await db.QuizQuestions
            .Where(q => questionIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id, ct);

        var session = new QuizSession
        {
            UserId = userId,
            RelationshipId = rel.Id,
            TotalQuestions = request.Answers.Count,
            CompletedAt = DateTime.UtcNow,
        };

        var score = 0;
        foreach (var submitted in request.Answers)
        {
            if (!questions.TryGetValue(submitted.QuestionId, out var question))
                throw new NotFoundException("Quiz question", submitted.QuestionId);

            var isCorrect = string.Equals(
                submitted.AnswerGiven?.Trim(),
                question.CorrectAnswer?.Trim(),
                StringComparison.OrdinalIgnoreCase);

            if (isCorrect) score++;

            session.Answers.Add(new QuizAnswer
            {
                QuestionId = question.Id,
                AnswerGiven = submitted.AnswerGiven ?? string.Empty,
                IsCorrect = isCorrect,
            });
        }

        session.Score = score;
        db.QuizSessions.Add(session);
        await db.SaveChangesAsync(ct);

        return MapSession(session, questions);
    }

    public async Task<IReadOnlyList<QuizSessionResponse>> GetHistoryAsync(Guid userId, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        var sessions = await db.QuizSessions
            .Include(s => s.Answers)
                .ThenInclude(a => a.Question)
            .Where(s => s.RelationshipId == rel.Id)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(ct);

        return sessions.Select(s => MapSession(s, null)).ToList();
    }

    private static QuizQuestionResponse MapQuestion(QuizQuestion q, Guid userId) => new()
    {
        Id = q.Id,
        QuestionText = q.QuestionText,
        Options = q.Options,
        CreatedByUserId = q.CreatedByUserId,
        CreatedByName = q.CreatedBy?.DisplayName,
        IsMine = q.CreatedByUserId == userId,
    };

    private static QuizSessionResponse MapSession(QuizSession session, IReadOnlyDictionary<Guid, QuizQuestion>? questionLookup) => new()
    {
        Id = session.Id,
        Score = session.Score,
        TotalQuestions = session.TotalQuestions,
        CompletedAt = session.CompletedAt,
        CreatedAt = session.CreatedAt,
        Answers = session.Answers.Select(a =>
        {
            var question = a.Question
                ?? (questionLookup != null && questionLookup.TryGetValue(a.QuestionId, out var q) ? q : null);
            return new QuizSessionAnswerResponse
            {
                QuestionId = a.QuestionId,
                QuestionText = question?.QuestionText ?? string.Empty,
                AnswerGiven = a.AnswerGiven,
                CorrectAnswer = question?.CorrectAnswer ?? string.Empty,
                IsCorrect = a.IsCorrect,
            };
        }).ToList(),
    };
}
