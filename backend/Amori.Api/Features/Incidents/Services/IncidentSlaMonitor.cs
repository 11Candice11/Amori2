using Amori.Api.Data.Context;
using Amori.Api.Domain.Enums;
using Amori.Api.Features.Notifications.Services;
using Microsoft.EntityFrameworkCore;

namespace Amori.Api.Features.Incidents.Services;

/// <summary>
/// Background worker that periodically detects SLA breaches and notifies the
/// relationship members. SLA state is otherwise only evaluated at read time
/// (see <see cref="IncidentSlaService.IsOverdue"/>), so without this monitor a
/// breach would never proactively reach the user.
///
/// A per-incident <c>SlaBreachNotifiedAt</c> stamp guarantees each breach is
/// announced at most once (it is cleared again when an incident is reopened).
/// </summary>
public sealed class IncidentSlaMonitor(
    IServiceScopeFactory scopeFactory,
    ILogger<IncidentSlaMonitor> logger) : BackgroundService
{
    private const string NotificationType = "Incident";

    /// <summary>How often to scan for freshly breached incidents.</summary>
    private static readonly TimeSpan ScanInterval = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("IncidentSlaMonitor started (scan interval {Interval}).", ScanInterval);

        // Small initial delay so the app finishes booting before the first scan.
        try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); }
        catch (OperationCanceledException) { return; }

        using var timer = new PeriodicTimer(ScanInterval);
        do
        {
            try
            {
                await ScanOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break; // shutting down
            }
            catch (Exception ex)
            {
                // Never let a transient failure kill the loop.
                logger.LogError(ex, "IncidentSlaMonitor scan failed; will retry next interval.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));

        logger.LogInformation("IncidentSlaMonitor stopping.");
    }

    private async Task ScanOnceAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AmoriDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var now = DateTime.UtcNow;

        // Incidents that are overdue, still active, and not yet announced.
        var breached = await db.RelationshipIncidents
            .Where(i =>
                i.DueAt.HasValue &&
                i.DueAt.Value < now &&
                i.SlaBreachNotifiedAt == null &&
                i.Status != IncidentStatus.Resolved &&
                i.Status != IncidentStatus.Closed)
            .ToListAsync(ct);

        if (breached.Count == 0) return;

        logger.LogInformation("IncidentSlaMonitor found {Count} newly breached incident(s).", breached.Count);

        foreach (var incident in breached)
        {
            var members = await scope.ServiceProvider
                .GetRequiredService<Amori.Api.Infrastructure.Relationships.IRelationshipAccessService>()
                .GetMembersAsync(incident.RelationshipId);

            var label = $"#{incident.Id.ToString()[..8].ToUpperInvariant()} · {incident.Title}";

            foreach (var member in members)
            {
                await notifications.CreateAsync(
                    member.Id,
                    "A care ticket has passed its SLA",
                    $"{label} is now overdue and needs attention.",
                    notificationType: NotificationType,
                    referenceId: incident.Id.ToString(),
                    ct);
            }

            // Mark as announced so we don't notify again on the next scan.
            incident.SlaBreachNotifiedAt = now;
        }

        await db.SaveChangesAsync(ct);
    }
}
