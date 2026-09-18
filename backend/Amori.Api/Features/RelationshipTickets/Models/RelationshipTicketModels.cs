using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.RelationshipTickets.Models;

/// <summary>
/// Internal model for ticket statistics within a relationship.
/// </summary>
public sealed class TicketStats
{
    public int Total { get; init; }
    public int Open { get; init; }
    public int InProgress { get; init; }
    public int Resolved { get; init; }
    public IDictionary<string, int> BySeverity { get; init; } = new Dictionary<string, int>();
    public IDictionary<string, int> ByCategory { get; init; } = new Dictionary<string, int>();
}
