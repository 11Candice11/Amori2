using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.VoiceNotes.DTOs;

public sealed class CreateVoiceNoteRequest
{
    public string Title { get; set; } = string.Empty;
    public string FileKey { get; set; } = string.Empty;
    public int DurationSeconds { get; set; }
    public VoiceNoteCategory Category { get; set; }
}

public sealed class UpdateVoiceNoteRequest
{
    public string? Title { get; set; }
    public VoiceNoteCategory? Category { get; set; }
}
