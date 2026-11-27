using System.Diagnostics;
using System.Security.Claims;

namespace Amori.Api.Common.Middleware;

/// <summary>
/// Logs every inbound HTTP request: method, path, response status, elapsed
/// time, and the authenticated user ID (when present).
///
/// One structured log entry per request at Information level — cheap enough to
/// leave on in production and gives you a full audit trail to diagnose issues
/// like a sign-in that never completes.
///
/// Example output:
///   POST /api/auth/login → 200 in 143ms (anonymous)
///   GET  /api/users/me   → 401 in  12ms (anonymous)
///   GET  /api/users/me   → 200 in  38ms (user: 3fa85f64-…)
/// </summary>
public sealed class RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
{
    // Skip health-check pings — they'd drown the logs with noise.
    private static readonly HashSet<string> SkippedPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/healthz",
    };

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        if (SkippedPaths.Contains(path))
        {
            await next(context);
            return;
        }

        var sw = Stopwatch.StartNew();

        try
        {
            await next(context);
        }
        finally
        {
            sw.Stop();

            var method   = context.Request.Method;
            var status   = context.Response.StatusCode;
            var ms       = sw.ElapsedMilliseconds;
            var userId   = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userInfo = userId is not null ? $"user: {userId}" : "anonymous";

            if (status >= 500)
            {
                // Errors are already logged with full detail by ExceptionHandlingMiddleware;
                // log a brief entry here so the request still appears in the timeline.
                logger.LogWarning(
                    "{Method} {Path} → {StatusCode} in {ElapsedMs}ms ({UserInfo})",
                    method, path, status, ms, userInfo);
            }
            else
            {
                logger.LogInformation(
                    "{Method} {Path} → {StatusCode} in {ElapsedMs}ms ({UserInfo})",
                    method, path, status, ms, userInfo);
            }
        }
    }
}
