using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Features.Distraction.DTOs;
using Amori.Api.Infrastructure.Relationships;
using Microsoft.EntityFrameworkCore;

namespace Amori.Api.Features.Distraction.Services;

public sealed class WouldYouRatherService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess) : IWouldYouRatherService
{
    public async Task<IReadOnlyList<WouldYouRatherQuestionResponse>> GetQuestionsAsync(Guid userId, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId);
        var relId = rel?.Id;

        // Global prompts + this couple's own prompts.
        var questions = await db.WouldYouRatherQuestions
            .Include(q => q.CreatedBy)
            .Where(q => q.IsActive && (q.RelationshipId == null || q.RelationshipId == relId))
            .OrderBy(q => q.CreatedAt)
            .ToListAsync(ct);

        var answers = rel == null
            ? []
            : await db.WouldYouRatherAnswers
                .Where(a => a.RelationshipId == rel.Id)
                .ToListAsync(ct);

        return questions.Select(q => Map(q, answers, userId)).ToList();
    }

    public async Task<WouldYouRatherQuestionResponse> CreateQuestionAsync(Guid userId, CreateWouldYouRatherRequest request, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        var optionA = request.OptionA?.Trim() ?? string.Empty;
        var optionB = request.OptionB?.Trim() ?? string.Empty;
        if (optionA.Length == 0 || optionB.Length == 0)
            throw new ValidationException("Both options are required.");

        var question = new WouldYouRatherQuestion
        {
            RelationshipId = rel.Id,
            CreatedByUserId = userId,
            OptionA = optionA,
            OptionB = optionB,
            IsActive = true,
        };
        db.WouldYouRatherQuestions.Add(question);
        await db.SaveChangesAsync(ct);

        question.CreatedBy = await db.Users.FindAsync([userId], ct);
        return Map(question, [], userId);
    }

    public async Task<WouldYouRatherQuestionResponse> AnswerAsync(Guid userId, Guid questionId, SubmitWouldYouRatherRequest request, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        var question = await db.WouldYouRatherQuestions
            .Include(q => q.CreatedBy)
            .FirstOrDefaultAsync(q => q.Id == questionId, ct)
            ?? throw new NotFoundException("Would You Rather question", questionId);

        var existing = await db.WouldYouRatherAnswers
            .FirstOrDefaultAsync(a => a.QuestionId == questionId && a.UserId == userId, ct);

        if (existing != null)
        {
            existing.ChoseOptionA = request.ChoseOptionA;
        }
        else
        {
            db.WouldYouRatherAnswers.Add(new WouldYouRatherAnswer
            {
                QuestionId = questionId,
                UserId = userId,
                RelationshipId = rel.Id,
                ChoseOptionA = request.ChoseOptionA,
            });
        }

        await db.SaveChangesAsync(ct);

        var answers = await db.WouldYouRatherAnswers
            .Where(a => a.RelationshipId == rel.Id && a.QuestionId == questionId)
            .ToListAsync(ct);

        return Map(question, answers, userId);
    }

    private static WouldYouRatherQuestionResponse Map(
        WouldYouRatherQuestion question,
        IReadOnlyList<WouldYouRatherAnswer> relationshipAnswers,
        Guid userId)
    {
        var forThisQuestion = relationshipAnswers.Where(a => a.QuestionId == question.Id).ToList();
        var mine = forThisQuestion.FirstOrDefault(a => a.UserId == userId);
        var partner = forThisQuestion.FirstOrDefault(a => a.UserId != userId);

        return new WouldYouRatherQuestionResponse
        {
            Id = question.Id,
            OptionA = question.OptionA,
            OptionB = question.OptionB,
            MyChoiceIsOptionA = mine?.ChoseOptionA,
            PartnerChoiceIsOptionA = partner?.ChoseOptionA,
            CreatedByUserId = question.CreatedByUserId,
            CreatedByName = question.CreatedBy?.DisplayName,
            IsMine = question.CreatedByUserId == userId,
        };
    }
}
