using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.LetsChat.DTOs;

/// <summary>
/// Create a new Let's Chat conversation. Always starts life as a private draft;
/// answers may be partial at this point.
/// </summary>
public sealed class CreateChatRequest
{
    public ChatTemplateType TemplateType { get; set; }
    public Dictionary<string, string> Answers { get; set; } = new();
    /// <summary>Optional pre-composed sentence; the server recomposes on send regardless.</summary>
    public string? ComposedMessage { get; set; }
}

/// <summary>
/// Patch an existing draft — used for autosave as the user works through steps.
/// Only the author of a still-private draft may update it.
/// </summary>
public sealed class UpdateChatRequest
{
    public Dictionary<string, string>? Answers { get; set; }
    public string? ComposedMessage { get; set; }
    /// <summary>Move a draft to <see cref="ChatMessageStatus.Private"/> ("save privately").</summary>
    public ChatMessageStatus? Status { get; set; }
}

/// <summary>Close a sent chat as resolved. Either partner may do this.</summary>
public sealed class ResolveChatRequest
{
    /// <summary>What was resolved or agreed. Required; blank is rejected.</summary>
    public string Resolution { get; set; } = string.Empty;
}
