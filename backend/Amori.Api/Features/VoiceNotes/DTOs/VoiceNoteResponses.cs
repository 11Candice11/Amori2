using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.VoiceNotes.DTOs;

public sealed class VoiceNoteResponse
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public Guid RelationshipId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string FileKey { get; init; } = string.Empty;
    public int DurationSeconds { get; init; }
    public VoiceNoteCategory Category { get; init; }
    public bool IsFavorite { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
