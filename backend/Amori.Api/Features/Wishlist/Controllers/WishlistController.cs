using Amori.Api.Features.Wishlist.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Wishlist.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Wishlist.Controllers;

/// <summary>Shared relationship wishlist.</summary>
[ApiController]
[Route("api/wishlist")]
[Authorize]
public sealed class WishlistController(
    IWishlistService wishlistService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<WishlistItemResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await wishlistService.GetAllAsync(RequireUserId(), ct));

    [HttpGet("{itemId:guid}")]
    [ProducesResponseType(typeof(WishlistItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid itemId, CancellationToken ct) =>
        Ok(await wishlistService.GetByIdAsync(RequireUserId(), itemId, ct));

    [HttpPost]
    [ProducesResponseType(typeof(WishlistItemResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateWishlistItemRequest req, CancellationToken ct)
    {
        var result = await wishlistService.CreateAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetById), new { itemId = result.Id }, result);
    }

    [HttpPatch("{itemId:guid}")]
    [ProducesResponseType(typeof(WishlistItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid itemId, [FromBody] UpdateWishlistItemRequest req, CancellationToken ct) =>
        Ok(await wishlistService.UpdateAsync(RequireUserId(), itemId, req, ct));

    [HttpDelete("{itemId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid itemId, CancellationToken ct)
    {
        await wishlistService.DeleteAsync(RequireUserId(), itemId, ct);
        return NoContent();
    }

    [HttpPost("{itemId:guid}/complete")]
    [ProducesResponseType(typeof(WishlistItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Complete(Guid itemId, CancellationToken ct) =>
        Ok(await wishlistService.CompleteAsync(RequireUserId(), itemId, ct));

    [HttpPost("{itemId:guid}/favorite")]
    [ProducesResponseType(typeof(WishlistItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Favorite(Guid itemId, CancellationToken ct) =>
        Ok(await wishlistService.FavoriteAsync(RequireUserId(), itemId, ct));
}
