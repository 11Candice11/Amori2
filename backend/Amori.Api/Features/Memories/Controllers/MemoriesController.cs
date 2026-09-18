using Amori.Api.Features.Memories.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Memories.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Memories;

/// <summary>Shared relationship memories with photo and voice note support.</summary>
[ApiController]
[Route("api/memories")]
[Authorize]
public sealed class MemoriesController(
    IMemoryService memoryService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>List all memories for the authenticated user's relationship.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<MemoryResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await memoryService.GetAllAsync(RequireUserId(), ct));

    /// <summary>Get a memory by ID.</summary>
    [HttpGet("{memoryId:guid}")]
    [ProducesResponseType(typeof(MemoryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid memoryId, CancellationToken ct) =>
        Ok(await memoryService.GetByIdAsync(RequireUserId(), memoryId, ct));

    /// <summary>Create a memory.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(MemoryResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateMemoryRequest req, CancellationToken ct)
    {
        var result = await memoryService.CreateAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetById), new { memoryId = result.Id }, result);
    }

    /// <summary>Update a memory.</summary>
    [HttpPatch("{memoryId:guid}")]
    [ProducesResponseType(typeof(MemoryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid memoryId, [FromBody] UpdateMemoryRequest req, CancellationToken ct) =>
        Ok(await memoryService.UpdateAsync(RequireUserId(), memoryId, req, ct));

    /// <summary>Delete a memory (soft-delete).</summary>
    [HttpDelete("{memoryId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid memoryId, CancellationToken ct)
    {
        await memoryService.DeleteAsync(RequireUserId(), memoryId, ct);
        return NoContent();
    }

    /// <summary>Favorite a memory.</summary>
    [HttpPost("{memoryId:guid}/favorite")]
    [ProducesResponseType(typeof(MemoryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Favorite(Guid memoryId, CancellationToken ct) =>
        Ok(await memoryService.FavoriteAsync(RequireUserId(), memoryId, ct));

    [HttpDelete("{memoryId:guid}/favorite")]
    [ProducesResponseType(typeof(MemoryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Unfavorite(Guid memoryId, CancellationToken ct) =>
        Ok(await memoryService.UnfavoriteAsync(RequireUserId(), memoryId, ct));

    /// <summary>Add media to a memory (file must already be uploaded to S3).</summary>
    [HttpPost("{memoryId:guid}/media")]
    [ProducesResponseType(typeof(MemoryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> AddMedia(Guid memoryId, [FromBody] AddMemoryMediaRequest req, CancellationToken ct) =>
        Ok(await memoryService.AddMediaAsync(RequireUserId(), memoryId, req, ct));

    /// <summary>Remove a media item from a memory.</summary>
    [HttpDelete("{memoryId:guid}/media/{mediaId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteMedia(Guid memoryId, Guid mediaId, CancellationToken ct)
    {
        await memoryService.DeleteMediaAsync(RequireUserId(), memoryId, mediaId, ct);
        return NoContent();
    }
}
