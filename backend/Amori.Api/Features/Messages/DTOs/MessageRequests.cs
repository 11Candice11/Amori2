using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Messages.DTOs;

public sealed class SendMessageRequest
{
    public string? Text { get; set; }
    public string? ImageKey { get; set; }
    public string? VoiceNoteKey { get; set; }
    public MessageCategory Category { get; set; } = MessageCategory.General;
}

public sealed class UpdateMessageRequest
{
    public string? Text { get; set; }
    public MessageCategory? Category { get; set; }
}
