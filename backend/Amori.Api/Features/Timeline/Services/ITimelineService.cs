using Amori.Api.Features.Timeline;
using Amori.Api.Features.Timeline.DTOs;

namespace Amori.Api.Features.Timeline.Services;

/// <summary>
/// Business logic for relationship timeline events.
/// </summary>
public interface ITimelineService
{
    Task<IReadOnlyList<TimelineEventResponse>> GetAllAsync(Guid userId, CancellationToken ct = default);
    Task<TimelineEventResponse> GetByIdAsync(Guid userId, Guid eventId, CancellationToken ct = default);
    Task<TimelineEventResponse> CreateAsync(Guid userId, CreateTimelineEventRequest request, CancellationToken ct = default);
    Task<TimelineEventResponse> UpdateAsync(Guid userId, Guid eventId, UpdateTimelineEventRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, Guid eventId, CancellationToken ct = default);
    Task<TimelineEventResponse> AddMediaAsync(Guid userId, Guid eventId, AddTimelineMediaRequest request, CancellationToken ct = default);
    Task<TimelineEventResponse> RemoveMediaAsync(Guid userId, Guid eventId, string photoKey, CancellationToken ct = default);
}
