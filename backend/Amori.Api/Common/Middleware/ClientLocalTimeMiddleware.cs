using System.Globalization;
using Amori.Api.Common.Exceptions;
using Amori.Api.Common.Time;

namespace Amori.Api.Common.Middleware;

/// <summary>
/// Reads the caller's local date and UTC offset headers once per request and
/// publishes them as <see cref="ClientLocalTime"/>.
///
/// Resolving this once, up front, is deliberate: a request that starts at
/// 23:59:59 local and finishes after midnight must use one date throughout,
/// otherwise a streak could be credited twice or skip a day.
///
/// Validation is split by intent. Absent headers are normal — most endpoints
/// don't need a date, and older clients won't send them — so they fall back to
/// the server's UTC date without complaint. Headers that are *present but
/// wrong* are a client bug worth surfacing loudly, so they 422. Headers that
/// are well-formed but implausibly far from the server's date are treated as
/// clock tampering: discarded, logged, and replaced with the server's UTC date.
/// </summary>
public sealed class ClientLocalTimeMiddleware(RequestDelegate next, ILogger<ClientLocalTimeMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context, TimeProvider clock, IClientLocalTimeAccessor accessor)
    {
        ((ClientLocalTimeAccessor)accessor).Set(Resolve(context, clock));
        await next(context);
    }

    private ClientLocalTime Resolve(HttpContext context, TimeProvider clock)
    {
        var rawDate = context.Request.Headers[ClientLocalTime.LocalDateHeader].FirstOrDefault();
        var rawOffset = context.Request.Headers[ClientLocalTime.UtcOffsetHeader].FirstOrDefault();

        // Neither header: nothing to validate, nothing to trust.
        if (string.IsNullOrWhiteSpace(rawDate) && string.IsNullOrWhiteSpace(rawOffset))
            return ClientLocalTime.FromServerUtc(clock);

        // One without the other is meaningless — we can't sanity-check a date
        // without knowing the zone it came from.
        if (string.IsNullOrWhiteSpace(rawDate) || string.IsNullOrWhiteSpace(rawOffset))
            throw new ValidationException(
                $"'{ClientLocalTime.LocalDateHeader}' and '{ClientLocalTime.UtcOffsetHeader}' must be sent together.");

        if (!DateOnly.TryParseExact(rawDate, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var localDate))
            throw new ValidationException(
                $"'{ClientLocalTime.LocalDateHeader}' must be a date in YYYY-MM-DD format.");

        if (!int.TryParse(rawOffset, NumberStyles.Integer, CultureInfo.InvariantCulture, out var offset))
            throw new ValidationException(
                $"'{ClientLocalTime.UtcOffsetHeader}' must be a whole number of minutes.");

        if (offset is < ClientLocalTime.MinUtcOffsetMinutes or > ClientLocalTime.MaxUtcOffsetMinutes)
            throw new ValidationException(
                $"'{ClientLocalTime.UtcOffsetHeader}' must be between " +
                $"{ClientLocalTime.MinUtcOffsetMinutes} and {ClientLocalTime.MaxUtcOffsetMinutes}.");

        var serverDate = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        var drift = Math.Abs(localDate.DayNumber - serverDate.DayNumber);

        if (drift > ClientLocalTime.MaxDaysFromServerUtc)
        {
            // Could be a wrong device clock or a deliberate attempt to advance
            // a streak. Either way we fall back rather than reject: failing the
            // whole request would make the app unusable for someone whose clock
            // is simply wrong.
            logger.LogWarning(
                "Discarding client local date {ClientDate} (offset {Offset}m) for {Path}; " +
                "server UTC date is {ServerDate}, drift {Drift} day(s) exceeds the allowed {Allowed}.",
                localDate, offset, context.Request.Path, serverDate, drift, ClientLocalTime.MaxDaysFromServerUtc);

            return ClientLocalTime.FromServerUtc(clock);
        }

        return new ClientLocalTime(localDate, offset, WasReported: true);
    }
}

/// <summary>
/// Scoped holder written once by <see cref="ClientLocalTimeMiddleware"/>.
/// Defaults to the server's UTC date so anything resolved outside a request
/// (background jobs, tests) still gets a usable value.
/// </summary>
public sealed class ClientLocalTimeAccessor(TimeProvider clock) : IClientLocalTimeAccessor
{
    private ClientLocalTime? _current;

    public ClientLocalTime Current => _current ??= ClientLocalTime.FromServerUtc(clock);

    internal void Set(ClientLocalTime value) => _current = value;
}
