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

    Task DeleteAsync(Guid userId, Guid id, CancellationToken ct = default);
}
