using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Timeline.DTOs;

public sealed class CreateTimelineEventRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly EventDate { get; set; }
    public string? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public TimelineEventType EventType { get; set; } = TimelineEventType.Custom;
    public List<string> PhotoKeys { get; set; } = [];
}

public sealed class UpdateTimelineEventRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public DateOnly? EventDate { get; set; }
    public string? Location { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public TimelineEventType? EventType { get; set; }
}

public sealed class AddTimelineMediaRequest
{
    public string PhotoKey { get; set; } = string.Empty;
}
