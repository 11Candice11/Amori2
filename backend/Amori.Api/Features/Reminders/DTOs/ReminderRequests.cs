using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Reminders.DTOs;

public sealed class CreateReminderRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public ReminderType Type { get; set; }
    public TimeOnly ReminderTime { get; set; }
    public RecurrenceType Recurrence { get; set; } = RecurrenceType.Daily;
    public DateOnly? OneTimeDate { get; set; }
    public bool IsEnabled { get; set; } = true;
}

public sealed class UpdateReminderRequest
{
    public string? Title { get; set; }
    public string? Notes { get; set; }
    public ReminderType? Type { get; set; }
    public TimeOnly? ReminderTime { get; set; }
    public RecurrenceType? Recurrence { get; set; }
    public DateOnly? OneTimeDate { get; set; }
    public bool? IsEnabled { get; set; }
}

public sealed class SnoozeReminderRequest
{
    public int SnoozeMinutes { get; set; } = 15;
}
