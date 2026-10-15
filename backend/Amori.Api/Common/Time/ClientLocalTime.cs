namespace Amori.Api.Common.Time;

/// <summary>
/// The caller's own idea of "what day is it", as reported by their device.
///
/// Day-based rules — points that may only be earned once a day, check-in
/// streaks, weekly reflection boundaries — have to agree with the calendar the
/// user is actually looking at. Deriving them from UTC gets the wrong answer
/// for anyone whose local date differs from UTC's, which near midnight is most
/// of the world.
///
/// The device is therefore trusted as the source of truth for the date, within
/// the limits enforced by <see cref="ClientLocalTimeMiddleware"/>. A user who
/// changes their clock can affect their own day-based state; they cannot affect
/// their partner's, because every comparison uses each person's own reported
/// date.
/// </summary>
/// <param name="LocalDate">The calendar date on the caller's device.</param>
/// <param name="UtcOffsetMinutes">
/// Minutes the device's clock is ahead of UTC (negative when behind).
/// </param>
/// <param name="WasReported">
/// False when the caller sent nothing usable and we fell back to the server's
/// UTC date. Callers that care about accuracy can branch on this; callers that
/// just need *a* date can ignore it.
/// </param>
public sealed record ClientLocalTime(DateOnly LocalDate, int UtcOffsetMinutes, bool WasReported)
{
    /// <summary>Header carrying the device's calendar date as "YYYY-MM-DD".</summary>
    public const string LocalDateHeader = "X-Amori-Local-Date";

    /// <summary>Header carrying the device's UTC offset in whole minutes.</summary>
    public const string UtcOffsetHeader = "X-Amori-Utc-Offset-Minutes";

    /// <summary>
    /// Widest real-world UTC offsets: UTC+14 (Kiritimati) and UTC−12. Anything
    /// outside this isn't a time zone, it's a bug or a forgery.
    /// </summary>
    public const int MinUtcOffsetMinutes = -840;
    public const int MaxUtcOffsetMinutes = 840;

    /// <summary>
    /// How far the device's date may differ from the server's UTC date before
    /// we stop believing it. One day is the smallest tolerance that works: a
    /// device at UTC+14 is legitimately "tomorrow" relative to UTC, and one at
    /// UTC−12 legitimately "yesterday".
    /// </summary>
    public const int MaxDaysFromServerUtc = 1;

    /// <summary>The fallback when the caller reports nothing usable.</summary>
    public static ClientLocalTime FromServerUtc(TimeProvider clock) =>
        new(DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime), 0, WasReported: false);
}

/// <summary>
/// Per-request access to the caller's <see cref="ClientLocalTime"/>. Resolved
/// once by <see cref="ClientLocalTimeMiddleware"/> so every service in the
/// request sees the same date, even if the request straddles midnight.
/// </summary>
public interface IClientLocalTimeAccessor
{
    ClientLocalTime Current { get; }
}
