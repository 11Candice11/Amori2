namespace Amori.Api.Features.Messages.Models;

/// <summary>
/// Internal model for unread message count summary.
/// </summary>
public sealed class MessageInboxSummary
{
    public int UnreadCount { get; init; }
    public DateTime? LastMessageAt { get; init; }
}
