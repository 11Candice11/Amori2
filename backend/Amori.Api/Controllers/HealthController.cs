using Amori.Api.Common.Responses;
using Amori.Api.Data.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Controllers;

[ApiController]
[Route("api/health")]
[AllowAnonymous]
public sealed class HealthController(AmoriDbContext db) : ControllerBase
{
    /// <summary>
    /// Health probe. Verifies both that the API process is running AND that it
    /// can reach its database, so a green health check genuinely means the
    /// service can serve requests.
    ///
    /// Returns 200 "healthy" when the database is reachable, and 503
    /// "degraded" when it is not — this is important for load balancers,
    /// uptime monitors and deploy scripts, which previously saw a 200 even
    /// while every DB-backed endpoint was failing.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<HealthResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<HealthResponse>), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        // A lightweight connectivity check — opens (and returns) a connection
        // without running a full query. Never throws: returns false on failure.
        var dbReachable = await CanReachDatabaseAsync(ct);

        var data = new HealthResponse(
            Status: dbReachable ? "healthy" : "degraded",
            Timestamp: DateTime.UtcNow,
            Version: "1.0.0",
            Database: dbReachable ? "up" : "down"
        );

        return dbReachable
            ? Ok(ApiResponse<HealthResponse>.Ok(data))
            : StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                ApiResponse<HealthResponse>.Ok(data, "Database is unreachable."));
    }

    private async Task<bool> CanReachDatabaseAsync(CancellationToken ct)
    {
        try
        {
            return await db.Database.CanConnectAsync(ct);
        }
        catch
        {
            // CanConnectAsync generally swallows connection errors and returns
            // false, but guard against provider-specific exceptions so the
            // health endpoint itself never 500s.
            return false;
        }
    }

    public sealed record HealthResponse(
        string Status,
        DateTime Timestamp,
        string Version,
        string Database
    );
}
