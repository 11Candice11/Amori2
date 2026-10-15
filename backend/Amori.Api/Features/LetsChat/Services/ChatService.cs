using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Domain.Enums;
using Amori.Api.Features.LetsChat.DTOs;
using Amori.Api.Features.Notifications;
using Amori.Api.Features.Notifications.Services;
using Amori.Api.Infrastructure.Relationships;
using Microsoft.EntityFrameworkCore;

namespace Amori.Api.Features.LetsChat.Services;

/// <summary>
/// Backing service for the guided "Let's Chat" feature. Mirrors the
/// relationship-scoped privacy pattern of <see cref="Messages.Services.MessageService"/>,
/// with one addition: while a conversation is a draft or private, it is visible
/// only to its author and is filtered out of every partner-facing read.
/// </summary>
public sealed class ChatService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess,
    INotificationService notifications) : IChatService
{
    private const string NotificationType = NotificationTypes.LetsChat;

    private static ChatConversationResponse Map(ChatConversation c, Guid callerId) => new()
    {
        Id = c.Id,
        RelationshipId = c.RelationshipId,
        SenderId = c.SenderId,
        SenderName = c.Sender?.DisplayName ?? string.Empty,
        RecipientId = c.RecipientId,
        TemplateType = c.TemplateType,
        Status = c.Status,
        Answers = c.Answers,
        ComposedMessage = c.ComposedMessage,
        IsPrivate = c.IsPrivate,
        IsMine = c.SenderId == callerId,
        SentAt = c.SentAt,
        ReadAt = c.ReadAt,
        CreatedAt = c.CreatedAt,
        UpdatedAt = c.UpdatedAt,
    };

    /// <summary>A draft or private message is only ever the author's own.</summary>
    private static bool IsPrivateState(ChatMessageStatus status) =>
        status is ChatMessageStatus.Draft or ChatMessageStatus.Private;

    public IReadOnlyList<ChatTemplates.ChatTemplateDefinition> GetTemplates() => ChatTemplates.All;

    public async Task<IReadOnlyList<ChatConversationResponse>> GetConversationsAsync(Guid userId, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        // Everything in the relationship that is either mine, or has been sent
        // (shared). The partner's private drafts (theirs + private) are excluded
        // because they are neither mine nor sent.
        return await db.ChatConversations
            .Include(c => c.Sender)
            .Where(c => c.RelationshipId == rel.Id &&
                        (c.SenderId == userId || !c.IsPrivate))
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => Map(c, userId))
            .ToListAsync(ct);
    }

    public async Task<ChatConversationResponse> GetConversationAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        var c = await db.ChatConversations.Include(x => x.Sender)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException("Conversation", id);

        if (c.RelationshipId != rel.Id) throw new ForbiddenException();
        // A private draft is only visible to its author, never the partner.
        if (c.IsPrivate && c.SenderId != userId) throw new NotFoundException("Conversation", id);

        return Map(c, userId);
    }

    public async Task<ChatConversationResponse> CreateAsync(Guid userId, CreateChatRequest request, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        if (ChatTemplates.Find(request.TemplateType) is null)
            throw new ValidationException($"Unknown template type '{request.TemplateType}'.");

        // A draft can be started before the partner exists; the recipient is
        // resolved (and required) at send time.
        var partner = await relAccess.GetPartnerAsync(userId);
        var answers = TrimAnswers(request.Answers);

        var conversation = new ChatConversation
        {
            RelationshipId = rel.Id,
            SenderId = userId,
            RecipientId = partner?.Id,
            TemplateType = request.TemplateType,
            Status = ChatMessageStatus.Draft,
            IsPrivate = true,
            Answers = answers,
            ComposedMessage = ChatComposer.Compose(request.TemplateType, answers),
        };

        db.ChatConversations.Add(conversation);
        await db.SaveChangesAsync(ct);
        conversation.Sender = (await db.Users.FindAsync([userId], ct))!;
        return Map(conversation, userId);
    }

    public async Task<ChatConversationResponse> UpdateAsync(Guid userId, Guid id, UpdateChatRequest request, CancellationToken ct = default)
    {
        var c = await db.ChatConversations.Include(x => x.Sender)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException("Conversation", id);

        if (c.SenderId != userId)
            throw new ForbiddenException("Only the author can edit this message.");
        // Once sent, the message is immutable — you can't retro-edit what the
        // partner has already received.
        if (!IsPrivateState(c.Status))
            throw new ConflictException("A sent message can no longer be edited.");

        if (request.Answers is not null)
        {
            c.Answers = TrimAnswers(request.Answers);
            c.ComposedMessage = ChatComposer.Compose(c.TemplateType, c.Answers);
        }
        // Allow an explicit composed override (e.g. the free-form template) but
        // only when answers weren't the source of truth this call.
        if (request.Answers is null && request.ComposedMessage is not null)
            c.ComposedMessage = request.ComposedMessage.Trim();

        if (request.Status.HasValue)
        {
            // The only status transitions the author may drive here are between
            // the two private states. Sending goes through SendAsync.
            if (!IsPrivateState(request.Status.Value))
                throw new ValidationException("Use the send endpoint to deliver a message.");
            c.Status = request.Status.Value;
            c.IsPrivate = true;
        }

        await db.SaveChangesAsync(ct);
        return Map(c, userId);
    }

    public async Task<ChatConversationResponse> SendAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        var partner = await relAccess.GetPartnerAsync(userId)
            ?? throw new ConflictException("Your relationship does not have a second partner yet.");

        var c = await db.ChatConversations.Include(x => x.Sender)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException("Conversation", id);

        if (c.SenderId != userId)
            throw new ForbiddenException("Only the author can send this message.");

        // Idempotent / duplicate-send protection: a message that's already left
        // the private state was already sent — return it unchanged rather than
        // re-notifying the partner.
        if (!IsPrivateState(c.Status))
            return Map(c, userId);

        // Required-field validation: no arbitrary word counts — just no empties.
        foreach (var input in ChatComposer.RequiredInputs(c.TemplateType))
        {
            if (!c.Answers.TryGetValue(input, out var value) || string.IsNullOrWhiteSpace(value))
                throw new ValidationException("Please complete every required field before sending.");
        }

        // Recompose from the stored answers so the delivered sentence is canonical.
        c.ComposedMessage = ChatComposer.Compose(c.TemplateType, c.Answers);
        if (string.IsNullOrWhiteSpace(c.ComposedMessage))
            throw new ValidationException("There's nothing to send yet.");

        c.RecipientId = partner.Id;
        c.Status = ChatMessageStatus.Sent;
        c.IsPrivate = false;
        c.SentAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        // Notify the partner. Deliberately does NOT include the (potentially
        // sensitive) message body — only a gentle prompt and the id to deep-link.
        var senderName = c.Sender?.DisplayName ?? "Your partner";
        await notifications.CreateAsync(
            partner.Id,
            "A gentle thought for you \u2764",
            $"{senderName} took a moment to put something into words for you.",
            notificationType: NotificationType,
            referenceId: c.Id.ToString(),
            ct);

        return Map(c, userId);
    }

    public async Task<ChatConversationResponse> MarkReadAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        var c = await db.ChatConversations.Include(x => x.Sender)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException("Conversation", id);

        if (c.RelationshipId != rel.Id) throw new ForbiddenException();
        if (c.RecipientId != userId)
            throw new ForbiddenException("Only the recipient can mark a message as read.");
        // Can't read a message that was never sent.
        if (IsPrivateState(c.Status))
            throw new ConflictException("This message hasn't been sent yet.");

        c.ReadAt ??= DateTime.UtcNow;
        c.Status = ChatMessageStatus.Read;
        await db.SaveChangesAsync(ct);
        return Map(c, userId);
    }

    public async Task DeleteAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var c = await db.ChatConversations
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException("Conversation", id);

        if (c.SenderId != userId)
            throw new ForbiddenException("Only the author can delete this message.");
        // A sent message is part of the shared record; only unsent drafts/private
        // messages can be discarded.
        if (!IsPrivateState(c.Status))
            throw new ConflictException("A sent message can no longer be deleted.");

        db.ChatConversations.Remove(c);
        await db.SaveChangesAsync(ct);
    }

    private static Dictionary<string, string> TrimAnswers(IDictionary<string, string> answers)
    {
        var result = new Dictionary<string, string>();
        foreach (var (key, value) in answers)
        {
            var trimmed = value?.Trim();
            if (!string.IsNullOrEmpty(trimmed))
                result[key] = trimmed;
        }
        return result;
    }
}
