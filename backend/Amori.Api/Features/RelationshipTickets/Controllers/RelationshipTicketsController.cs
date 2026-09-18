using Amori.Api.Features.RelationshipTickets.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Domain.Enums;
using Amori.Api.Features.RelationshipTickets.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.RelationshipTickets.Controllers;

/// <summary>Let's Chat — relationship communication ticket system.</summary>
[ApiController]
[Route("api/tickets")]
[Authorize]
public sealed class RelationshipTicketsController(
    IRelationshipTicketService ticketService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TicketDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] TicketStatus? status, CancellationToken ct) =>
        Ok(await ticketService.GetAllAsync(RequireUserId(), status, ct));

    [HttpGet("{ticketId:guid}")]
    [ProducesResponseType(typeof(TicketDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid ticketId, CancellationToken ct) =>
        Ok(await ticketService.GetByIdAsync(RequireUserId(), ticketId, ct));

    [HttpPost]
    [ProducesResponseType(typeof(TicketDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateTicketRequest req, CancellationToken ct)
    {
        var result = await ticketService.CreateAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetById), new { ticketId = result.Id }, result);
    }

    [HttpPatch("{ticketId:guid}")]
    [ProducesResponseType(typeof(TicketDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid ticketId, [FromBody] UpdateTicketRequest req, CancellationToken ct) =>
        Ok(await ticketService.UpdateAsync(RequireUserId(), ticketId, req, ct));

    [HttpDelete("{ticketId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid ticketId, CancellationToken ct)
    {
        await ticketService.DeleteAsync(RequireUserId(), ticketId, ct);
        return NoContent();
    }

    [HttpPost("{ticketId:guid}/acknowledge")]
    [ProducesResponseType(typeof(TicketDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Acknowledge(Guid ticketId, CancellationToken ct) =>
        Ok(await ticketService.AcknowledgeAsync(RequireUserId(), ticketId, ct));

    [HttpPost("{ticketId:guid}/assign")]
    [ProducesResponseType(typeof(TicketDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Assign(Guid ticketId, [FromBody] AssignTicketRequest req, CancellationToken ct) =>
        Ok(await ticketService.AssignAsync(RequireUserId(), ticketId, req, ct));

    [HttpPost("{ticketId:guid}/respond")]
    [ProducesResponseType(typeof(TicketDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Respond(Guid ticketId, [FromBody] AddTicketResponseRequest req, CancellationToken ct) =>
        Ok(await ticketService.RespondAsync(RequireUserId(), ticketId, req, ct));

    [HttpGet("{ticketId:guid}/responses")]
    [ProducesResponseType(typeof(IReadOnlyList<TicketResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetResponses(Guid ticketId, CancellationToken ct) =>
        Ok(await ticketService.GetResponsesAsync(RequireUserId(), ticketId, ct));

    [HttpPost("{ticketId:guid}/status")]
    [ProducesResponseType(typeof(TicketDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetStatus(Guid ticketId, [FromBody] TicketStatus status, CancellationToken ct) =>
        Ok(await ticketService.SetStatusAsync(RequireUserId(), ticketId, status, ct));

    [HttpPost("{ticketId:guid}/resolve")]
    [ProducesResponseType(typeof(TicketDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Resolve(Guid ticketId, CancellationToken ct) =>
        Ok(await ticketService.ResolveAsync(RequireUserId(), ticketId, ct));

    [HttpPost("{ticketId:guid}/reopen")]
    [ProducesResponseType(typeof(TicketDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Reopen(Guid ticketId, CancellationToken ct) =>
        Ok(await ticketService.ReopenAsync(RequireUserId(), ticketId, ct));
}
