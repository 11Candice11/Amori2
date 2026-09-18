using Amori.Api.Domain.Enums;
using Amori.Api.Features.Incidents.Services;
using Xunit;

namespace Amori.Api.Tests;

/// <summary>
/// Verifies that an incident's SLA due date is driven by impact + urgency
/// (via the priority matrix) and is NOT the same for every combination.
/// </summary>
public sealed class IncidentSlaCalculationTests
{
    private readonly IncidentPriorityService _priority = new();
    private readonly IncidentSlaService _sla = new();

    // Priority matrix expectations (Impact × Urgency → Priority).
    [Theory]
    [InlineData(IncidentImpact.Low, IncidentUrgency.Low, IncidentPriority.Low)]
    [InlineData(IncidentImpact.Low, IncidentUrgency.High, IncidentPriority.Medium)]
    [InlineData(IncidentImpact.Low, IncidentUrgency.Critical, IncidentPriority.High)]
    [InlineData(IncidentImpact.Medium, IncidentUrgency.Medium, IncidentPriority.Medium)]
    [InlineData(IncidentImpact.Medium, IncidentUrgency.Critical, IncidentPriority.Critical)]
    [InlineData(IncidentImpact.High, IncidentUrgency.Low, IncidentPriority.Medium)]
    [InlineData(IncidentImpact.High, IncidentUrgency.Critical, IncidentPriority.Critical)]
    [InlineData(IncidentImpact.Critical, IncidentUrgency.Low, IncidentPriority.High)]
    [InlineData(IncidentImpact.Critical, IncidentUrgency.High, IncidentPriority.Critical)]
    public void Calculate_MapsImpactAndUrgency_ToExpectedPriority(
        IncidentImpact impact, IncidentUrgency urgency, IncidentPriority expected)
    {
        Assert.Equal(expected, _priority.Calculate(impact, urgency));
    }

    // SLA offset expectations per priority.
    [Theory]
    [InlineData(IncidentPriority.Low, 7 * 24 * 60)]   // 7 days
    [InlineData(IncidentPriority.Medium, 3 * 24 * 60)] // 3 days
    [InlineData(IncidentPriority.High, 24 * 60)]        // 24 hours
    [InlineData(IncidentPriority.Critical, 4 * 60)]     // 4 hours
    public void CalculateDueAt_UsesPriorityOffset(IncidentPriority priority, int expectedMinutes)
    {
        var createdAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        var dueAt = _sla.CalculateDueAt(priority, createdAt);

        Assert.Equal(expectedMinutes, (dueAt - createdAt).TotalMinutes);
    }

    [Fact]
    public void EndToEnd_DifferentImpactUrgency_ProduceDifferentDueDates()
    {
        var createdAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        DateTime DueFor(IncidentImpact impact, IncidentUrgency urgency) =>
            _sla.CalculateDueAt(_priority.Calculate(impact, urgency), createdAt);

        var lowLow = DueFor(IncidentImpact.Low, IncidentUrgency.Low);           // Low priority → 7 days
        var mediumMedium = DueFor(IncidentImpact.Medium, IncidentUrgency.Medium); // Medium → 3 days
        var highCritical = DueFor(IncidentImpact.High, IncidentUrgency.Critical); // Critical → 4 hours

        // The three combinations must yield three distinct due dates.
        Assert.Equal(createdAt.AddDays(7), lowLow);
        Assert.Equal(createdAt.AddDays(3), mediumMedium);
        Assert.Equal(createdAt.AddHours(4), highCritical);

        Assert.NotEqual(lowLow, mediumMedium);
        Assert.NotEqual(mediumMedium, highCritical);
        Assert.NotEqual(lowLow, highCritical);
    }
}
