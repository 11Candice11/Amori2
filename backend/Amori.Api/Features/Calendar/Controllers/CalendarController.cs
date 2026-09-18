using Amori.Api.Features.Calendar.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Calendar.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Calendar.Controllers;

/// <summary>Shared relationship calendar events.</summary>
[ApiController]
[Route("api/calendar/events")]
[Authorize]
public sealed class CalendarController(
    ICalendarService calendarService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CalendarEventResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] int? year, [FromQuery] int? month, CancellationToken ct) =>
        Ok(await calendarService.GetAllAsync(RequireUserId(), year, month, ct));

    [HttpGet("{eventId:guid}")]
    [ProducesResponseType(typeof(CalendarEventResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid eventId, CancellationToken ct) =>
        Ok(await calendarService.GetByIdAsync(RequireUserId(), eventId, ct));

    [HttpPost]
    [ProducesResponseType(typeof(CalendarEventResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateCalendarEventRequest req, CancellationToken ct)
    {
        var result = await calendarService.CreateAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetById), new { eventId = result.Id }, result);
    }

    [HttpPatch("{eventId:guid}")]
    [ProducesResponseType(typeof(CalendarEventResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid eventId, [FromBody] UpdateCalendarEventRequest req, CancellationToken ct) =>
        Ok(await calendarService.UpdateAsync(RequireUserId(), eventId, req, ct));

    [HttpDelete("{eventId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid eventId, CancellationToken ct)
    {
        await calendarService.DeleteAsync(RequireUserId(), eventId, ct);
        return NoContent();
    }

    [HttpPost("{eventId:guid}/complete")]
    [ProducesResponseType(typeof(CalendarEventResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Complete(Guid eventId, CancellationToken ct) =>
        Ok(await calendarService.CompleteAsync(RequireUserId(), eventId, ct));
}
