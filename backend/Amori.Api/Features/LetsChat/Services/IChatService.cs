using Amori.Api.Features.LetsChat.DTOs;

namespace Amori.Api.Features.LetsChat.Services;

public interface IChatService
{
    IReadOnlyList<ChatTemplates.ChatTemplateDefinition> GetTemplates();

    /// <summary>
    /// The caller's own drafts/private messages plus every message sent between
    /// the two partners. Never returns the partner's private drafts.
    /// </summary>
    Task<IReadOnlyList<ChatConversationResponse>> GetConversationsAsync(Guid userId, CancellationToken ct = default);

    Task<ChatConversationResponse> GetConversationAsync(Guid userId, Guid id, CancellationToken ct = default);

    Task<ChatConversationResponse> CreateAsync(Guid userId, CreateChatRequest request, CancellationToken ct = default);

    Task<ChatConversationResponse> UpdateAsync(Guid userId, Guid id, UpdateChatRequest request, CancellationToken ct = default);

    Task<ChatConversationResponse> SendAsync(Guid userId, Guid id, CancellationToken ct = default);

    Task<ChatConversationResponse> MarkReadAsync(Guid userId, Guid id, CancellationToken ct = default);

    /// <summary>
    /// Close a sent chat as resolved with a written resolution. Either partner may
    /// do it; 409 if the message is unsent or already resolved, 422 if the
    /// resolution is blank or too long.
    /// </summary>
    Task<ChatConversationResponse> ResolveAsync(Guid userId, Guid id, ResolveChatRequest request, CancellationToken ct = default);

    Task DeleteAsync(Guid userId, Guid id, CancellationToken ct = default);
}
