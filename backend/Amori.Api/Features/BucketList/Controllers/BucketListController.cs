using Amori.Api.Features.BucketList.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.BucketList.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.BucketList.Controllers;

/// <summary>Shared relationship bucket list.</summary>
[ApiController]
[Route("api/bucket-list")]
[Authorize]
public sealed class BucketListController(
    IBucketListService bucketListService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<BucketListItemResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await bucketListService.GetAllAsync(RequireUserId(), ct));

    [HttpGet("{itemId:guid}")]
    [ProducesResponseType(typeof(BucketListItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid itemId, CancellationToken ct) =>
        Ok(await bucketListService.GetByIdAsync(RequireUserId(), itemId, ct));

    [HttpPost]
    [ProducesResponseType(typeof(BucketListItemResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateBucketListItemRequest req, CancellationToken ct)
    {
        var result = await bucketListService.CreateAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetById), new { itemId = result.Id }, result);
    }

    [HttpPatch("{itemId:guid}")]
    [ProducesResponseType(typeof(BucketListItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid itemId, [FromBody] UpdateBucketListItemRequest req, CancellationToken ct) =>
        Ok(await bucketListService.UpdateAsync(RequireUserId(), itemId, req, ct));

    [HttpDelete("{itemId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid itemId, CancellationToken ct)
    {
        await bucketListService.DeleteAsync(RequireUserId(), itemId, ct);
        return NoContent();
    }

    /// <summary>Toggle the item's completion state (completes or un-completes).</summary>
    [HttpPost("{itemId:guid}/complete")]
    [ProducesResponseType(typeof(BucketListItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Complete(Guid itemId, CancellationToken ct) =>
        Ok(await bucketListService.CompleteAsync(RequireUserId(), itemId, ct));

    [HttpPost("{itemId:guid}/favorite")]
    [ProducesResponseType(typeof(BucketListItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Favorite(Guid itemId, CancellationToken ct) =>
        Ok(await bucketListService.ToggleFavoriteAsync(RequireUserId(), itemId, ct));
}
