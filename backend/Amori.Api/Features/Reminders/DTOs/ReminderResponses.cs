using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Reminders.DTOs;

public sealed class ReminderResponse
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public ReminderType Type { get; init; }
    public TimeOnly ReminderTime { get; init; }
    public RecurrenceType Recurrence { get; init; }
    public DateOnly? OneTimeDate { get; init; }
    public bool IsEnabled { get; init; }
    public DateTime? LastCompletedAt { get; init; }
    public DateTime? SnoozeUntil { get; init; }
    public DateTime? NextOccurrenceAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
