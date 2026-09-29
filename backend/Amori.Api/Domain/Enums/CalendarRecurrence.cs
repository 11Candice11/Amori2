namespace Amori.Api.Domain.Enums;

/// <summary>
/// How often a calendar event repeats. <see cref="None"/> is a one-off event.
/// The recurrence is stored on the single event row; the client expands it
/// across the month/day views rather than the server materialising copies.
/// </summary>
public enum CalendarRecurrence
{
    None = 0,
    Weekly = 1,
    Monthly = 2,
    Yearly = 3,
}
