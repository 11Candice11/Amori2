namespace Amori.Api.Features.Reminders.Models;

/// <summary>
/// Internal model for calculating the next reminder occurrence.
/// </summary>
public sealed class ReminderOccurrence
{
    public Guid ReminderId { get; init; }
    public DateTime NextFireAt { get; init; }
    public bool IsSnoozed { get; init; }
}
