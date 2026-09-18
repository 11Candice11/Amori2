using Amori.Api.Features.DatePlanner.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Domain.Enums;
using Amori.Api.Features.DatePlanner.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.DatePlanner.Controllers;

/// <summary>Date ideas and planning for the relationship.</summary>
[ApiController]
[Route("api/dates")]
[Authorize]
public sealed class DatePlannerController(
    IDatePlannerService datePlannerService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<DateIdeaResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] DateCategory? category, CancellationToken ct) =>
        Ok(await datePlannerService.GetAllAsync(RequireUserId(), category, ct));

    [HttpGet("{dateId:guid}")]
    [ProducesResponseType(typeof(DateIdeaResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid dateId, CancellationToken ct) =>
        Ok(await datePlannerService.GetByIdAsync(RequireUserId(), dateId, ct));

    [HttpPost]
    [ProducesResponseType(typeof(DateIdeaResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateDateIdeaRequest req, CancellationToken ct)
    {
        var result = await datePlannerService.CreateAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetById), new { dateId = result.Id }, result);
    }

    [HttpPatch("{dateId:guid}")]
    [ProducesResponseType(typeof(DateIdeaResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid dateId, [FromBody] UpdateDateIdeaRequest req, CancellationToken ct) =>
        Ok(await datePlannerService.UpdateAsync(RequireUserId(), dateId, req, ct));

    [HttpDelete("{dateId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid dateId, CancellationToken ct)
    {
        await datePlannerService.DeleteAsync(RequireUserId(), dateId, ct);
        return NoContent();
    }

    [HttpPost("{dateId:guid}/complete")]
    [ProducesResponseType(typeof(DateIdeaResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Complete(Guid dateId, CancellationToken ct) =>
        Ok(await datePlannerService.CompleteAsync(RequireUserId(), dateId, ct));

    /// <summary>Get available date categories.</summary>
    [HttpGet("categories")]
    public IActionResult GetCategories() =>
        Ok(Enum.GetValues<DateCategory>().Select(c => new { value = c, name = c.ToString() }));

    /// <summary>Return a random date idea from the relationship's list.</summary>
    [HttpPost("random")]
    [ProducesResponseType(typeof(DateIdeaResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRandom(CancellationToken ct)
    {
        var result = await datePlannerService.GetRandomAsync(RequireUserId(), ct);
        return result is null ? NoContent() : Ok(result);
    }
}
