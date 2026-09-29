using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.LetsChat.DTOs;

public sealed class ChatConversationResponse
{
    public Guid Id { get; init; }
    public Guid RelationshipId { get; init; }
    public Guid SenderId { get; init; }
    public string SenderName { get; init; } = string.Empty;
    public Guid? RecipientId { get; init; }
    public ChatTemplateType TemplateType { get; init; }
    public ChatMessageStatus Status { get; init; }
    public IReadOnlyDictionary<string, string> Answers { get; init; } = new Dictionary<string, string>();
    public string ComposedMessage { get; init; } = string.Empty;
    public bool IsPrivate { get; init; }
    /// <summary>True only for the caller's own messages — the client uses this to gate edit/delete.</summary>
    public bool IsMine { get; init; }
    public DateTime? SentAt { get; init; }
    public DateTime? ReadAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
