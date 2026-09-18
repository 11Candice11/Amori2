using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Timeline.DTOs;

public sealed class TimelineEventResponse
{
    public Guid Id { get; init; }
    public Guid RelationshipId { get; init; }
    public Guid CreatedByUserId { get; init; }
    public string CreatedByName { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateOnly EventDate { get; init; }
    public string? Location { get; init; }
    public TimelineEventType EventType { get; init; }
    public List<string> PhotoKeys { get; init; } = [];
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
