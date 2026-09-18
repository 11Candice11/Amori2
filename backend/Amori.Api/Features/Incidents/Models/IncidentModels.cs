using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Incidents.Models;

/// <summary>
/// Internal model for SLA calculation context.
/// </summary>
public sealed class IncidentSlaContext
{
    public Guid IncidentId { get; init; }
    public IncidentPriority Priority { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime DueAt { get; init; }
    public IncidentStatus Status { get; init; }
    public bool IsOverdue { get; init; }
    public double RemainingSeconds { get; init; }
}

/// <summary>
/// Internal model for incident priority matrix calculation inputs.
/// </summary>
public sealed class IncidentPriorityInput
{
    public IncidentImpact Impact { get; init; }
    public IncidentUrgency Urgency { get; init; }
}
