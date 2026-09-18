using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.VoiceNotes.Models;

/// <summary>
/// Internal model for voice note storage metadata before S3 upload confirmation.
/// </summary>
public sealed class VoiceNoteUploadContext
{
    public string FileKey { get; init; } = string.Empty;
    public int DurationSeconds { get; init; }
    public VoiceNoteCategory Category { get; init; }
}
