using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Messages.DTOs;

public sealed class MessageResponse
{
    public Guid Id { get; init; }
    public Guid RelationshipId { get; init; }
    public Guid SenderId { get; init; }
    public string SenderName { get; init; } = string.Empty;
    public Guid RecipientId { get; init; }
    public string? Text { get; init; }
    public string? ImageKey { get; init; }
    public string? VoiceNoteKey { get; init; }
    public MessageCategory Category { get; init; }
    public bool IsRead { get; init; }
    public DateTime? ReadAt { get; init; }
    public bool IsFavorite { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
