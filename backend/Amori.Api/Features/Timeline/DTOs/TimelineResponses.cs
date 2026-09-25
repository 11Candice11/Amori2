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
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
    public TimelineEventType EventType { get; init; }

    /// <summary>
    /// Raw storage keys for the event's photos. Kept for backwards
    /// compatibility; clients should prefer <see cref="Photos"/> which carries
    /// loadable URLs.
    /// </summary>
    public List<string> PhotoKeys { get; init; } = [];

    /// <summary>The event's photos with both the storage key and a loadable URL.</summary>
    public List<TimelinePhotoResponse> Photos { get; init; } = [];

    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

public sealed class TimelinePhotoResponse
{
    /// <summary>Opaque storage key persisted on the event.</summary>
    public string PhotoKey { get; init; } = string.Empty;

    /// <summary>A loadable URL for the photo (presigned for S3, static for local).</summary>
    public string Url { get; init; } = string.Empty;
}
