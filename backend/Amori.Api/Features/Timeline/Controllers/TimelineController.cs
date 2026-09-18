using Amori.Api.Features.Timeline.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Timeline.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Timeline;

/// <summary>Relationship timeline events (first date, anniversary, milestones).</summary>
[ApiController]
[Route("api/timeline")]
[Authorize]
public sealed class TimelineController(
    ITimelineService timelineService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>Get all timeline events for the relationship, ordered by event date.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TimelineEventResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await timelineService.GetAllAsync(RequireUserId(), ct));

    [HttpGet("{eventId:guid}")]
    [ProducesResponseType(typeof(TimelineEventResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid eventId, CancellationToken ct) =>
        Ok(await timelineService.GetByIdAsync(RequireUserId(), eventId, ct));

    [HttpPost]
    [ProducesResponseType(typeof(TimelineEventResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateTimelineEventRequest req, CancellationToken ct)
    {
        var result = await timelineService.CreateAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetById), new { eventId = result.Id }, result);
    }

    [HttpPatch("{eventId:guid}")]
    [ProducesResponseType(typeof(TimelineEventResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid eventId, [FromBody] UpdateTimelineEventRequest req, CancellationToken ct) =>
        Ok(await timelineService.UpdateAsync(RequireUserId(), eventId, req, ct));

    [HttpDelete("{eventId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid eventId, CancellationToken ct)
    {
        await timelineService.DeleteAsync(RequireUserId(), eventId, ct);
        return NoContent();
    }

    /// <summary>Add a photo key to an existing timeline event.</summary>
    [HttpPost("{eventId:guid}/media")]
    [ProducesResponseType(typeof(TimelineEventResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> AddMedia(Guid eventId, [FromBody] AddTimelineMediaRequest req, CancellationToken ct) =>
        Ok(await timelineService.AddMediaAsync(RequireUserId(), eventId, req, ct));
}
