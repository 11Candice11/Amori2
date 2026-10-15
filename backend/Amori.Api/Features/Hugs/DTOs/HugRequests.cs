using System.ComponentModel.DataAnnotations;

namespace Amori.Api.Features.Hugs.DTOs;

/// <summary>
/// Payload for sending a hug. The body is optional — a hug can be sent with no
/// content at all. When present, <see cref="Whisper"/> is a short, gentle note
/// delivered alongside the hug.
/// </summary>
public sealed class SendHugRequest
{
    [MaxLength(500)]
    public string? Whisper { get; init; }

    /// <summary>
    /// How long the sender held the button down, in milliseconds.
    ///
    /// Sending a hug is a press-and-hold gesture, so the app already knows
    /// this; reporting it lets a deliberate, lingering hug count for more than
    /// a tap. Optional, because older clients don't send it.
    /// </summary>
    public int? HoldDurationMs { get; init; }
}
