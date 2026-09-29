namespace Amori.Api.Domain.Enums;

/// <summary>
/// Lifecycle of a "Let's Chat" conversation.
///
/// <list type="bullet">
/// <item><see cref="Draft"/> — a private, in-progress composition. Only the
/// author can see it; it is never returned through partner-facing reads.</item>
/// <item><see cref="Private"/> — the author finished a message but chose to
/// keep it to themselves rather than send it. Still author-only.</item>
/// <item><see cref="Sent"/> — delivered to the partner and visible to both.</item>
/// <item><see cref="Delivered"/> — reserved for future push-receipt tracking;
/// treated like <see cref="Sent"/> for visibility.</item>
/// <item><see cref="Read"/> — the recipient has opened it.</item>
/// </list>
///
/// Numbered from 1 so the DB int is stable; serialized as the string name.
/// </summary>
public enum ChatMessageStatus
{
    Draft = 1,
    Sent = 2,
    Delivered = 3,
    Read = 4,
    Private = 5,
}
