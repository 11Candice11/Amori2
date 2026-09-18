using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Relationships.DTOs;
using Amori.Api.Features.Relationships.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Relationships;

[ApiController]
[Route("api/relationships")]
[Authorize]
public sealed class RelationshipsController(
    IRelationshipService relationshipService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    [HttpPost]
    [ProducesResponseType(typeof(RelationshipResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateRelationship([FromBody] CreateRelationshipRequest request, CancellationToken ct)
    {
        var result = await relationshipService.CreateAsync(RequireUserId(), request, ct);
        return CreatedAtAction(nameof(GetMyRelationship), new { }, result);
    }

    [HttpGet("me")]
    [ProducesResponseType(typeof(RelationshipResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyRelationship(CancellationToken ct)
    {
        var result = await relationshipService.GetMyRelationshipAsync(RequireUserId(), ct);
        return result is null ? NotFound(new { message = "User does not belong to a relationship." }) : Ok(result);
    }

    [HttpPost("{relationshipId:guid}/join")]
    [ProducesResponseType(typeof(RelationshipResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> JoinRelationship(Guid relationshipId, CancellationToken ct) =>
        Ok(await relationshipService.JoinAsync(RequireUserId(), relationshipId, ct));
}
