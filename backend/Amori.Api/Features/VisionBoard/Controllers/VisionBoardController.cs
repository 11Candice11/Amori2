using Amori.Api.Common.Exceptions;
using Amori.Api.Features.VisionBoard.DTOs;
using Amori.Api.Features.VisionBoard.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.VisionBoard.Controllers;

/// <summary>
/// The couple's shared "Us" Vision Board — sections (shelves) and the items on
/// them. Everything is scoped to the authenticated user's relationship.
/// </summary>
[ApiController]
[Route("api/vision-board")]
[Authorize]
public sealed class VisionBoardController(
    IVisionBoardService visionBoard,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    // ── Board ──────────────────────────────────────────────────────────────

    /// <summary>The whole board: ordered sections plus every active and completed item.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(VisionBoardResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBoard(CancellationToken ct) =>
        Ok(await visionBoard.GetBoardAsync(RequireUserId(), ct));

    // ── Items ────────────────────────────────────────────────────────────────

    [HttpGet("items/{itemId:guid}")]
    [ProducesResponseType(typeof(VisionBoardItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetItem(Guid itemId, CancellationToken ct) =>
        Ok(await visionBoard.GetItemAsync(RequireUserId(), itemId, ct));

    [HttpPost("items")]
    [ProducesResponseType(typeof(VisionBoardItemResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateItem([FromBody] CreateVisionBoardItemRequest req, CancellationToken ct)
    {
        var result = await visionBoard.CreateItemAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetItem), new { itemId = result.Id }, result);
    }

    [HttpPatch("items/{itemId:guid}")]
    [ProducesResponseType(typeof(VisionBoardItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateItem(Guid itemId, [FromBody] UpdateVisionBoardItemRequest req, CancellationToken ct) =>
        Ok(await visionBoard.UpdateItemAsync(RequireUserId(), itemId, req, ct));

    [HttpDelete("items/{itemId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteItem(Guid itemId, CancellationToken ct)
    {
        await visionBoard.DeleteItemAsync(RequireUserId(), itemId, ct);
        return NoContent();
    }

    /// <summary>Mark an item achieved, with an optional completion note.</summary>
    [HttpPost("items/{itemId:guid}/complete")]
    [ProducesResponseType(typeof(VisionBoardItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> CompleteItem(Guid itemId, [FromBody] CompleteVisionBoardItemRequest? req, CancellationToken ct) =>
        Ok(await visionBoard.CompleteItemAsync(RequireUserId(), itemId, req ?? new CompleteVisionBoardItemRequest(), ct));

    [HttpPost("items/{itemId:guid}/uncomplete")]
    [ProducesResponseType(typeof(VisionBoardItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UncompleteItem(Guid itemId, CancellationToken ct) =>
        Ok(await visionBoard.UncompleteItemAsync(RequireUserId(), itemId, ct));

    /// <summary>Move an item to a different section.</summary>
    [HttpPost("items/{itemId:guid}/move")]
    [ProducesResponseType(typeof(VisionBoardItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> MoveItem(Guid itemId, [FromBody] MoveVisionBoardItemRequest req, CancellationToken ct) =>
        Ok(await visionBoard.MoveItemAsync(RequireUserId(), itemId, req, ct));

    /// <summary>Pin or unpin an item.</summary>
    [HttpPost("items/{itemId:guid}/pin")]
    [ProducesResponseType(typeof(VisionBoardItemResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> PinItem(Guid itemId, [FromBody] PinVisionBoardItemRequest req, CancellationToken ct) =>
        Ok(await visionBoard.SetPinnedAsync(RequireUserId(), itemId, req, ct));

    /// <summary>Reorder items (optionally scoped to a section).</summary>
    [HttpPost("items/reorder")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ReorderItems([FromBody] ReorderVisionBoardItemsRequest req, CancellationToken ct)
    {
        await visionBoard.ReorderItemsAsync(RequireUserId(), req, ct);
        return NoContent();
    }

    // ── Sections ──────────────────────────────────────────────────────────────

    [HttpGet("sections")]
    [ProducesResponseType(typeof(IReadOnlyList<VisionBoardSectionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSections(CancellationToken ct) =>
        Ok(await visionBoard.GetSectionsAsync(RequireUserId(), ct));

    [HttpPost("sections")]
    [ProducesResponseType(typeof(VisionBoardSectionResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateSection([FromBody] CreateVisionBoardSectionRequest req, CancellationToken ct)
    {
        var result = await visionBoard.CreateSectionAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetSections), null, result);
    }

    [HttpPatch("sections/{sectionId:guid}")]
    [ProducesResponseType(typeof(VisionBoardSectionResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateSection(Guid sectionId, [FromBody] UpdateVisionBoardSectionRequest req, CancellationToken ct) =>
        Ok(await visionBoard.UpdateSectionAsync(RequireUserId(), sectionId, req, ct));

    [HttpDelete("sections/{sectionId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteSection(Guid sectionId, CancellationToken ct)
    {
        await visionBoard.DeleteSectionAsync(RequireUserId(), sectionId, ct);
        return NoContent();
    }

    /// <summary>Reorder sections.</summary>
    [HttpPost("sections/reorder")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ReorderSections([FromBody] ReorderVisionBoardSectionsRequest req, CancellationToken ct)
    {
        await visionBoard.ReorderSectionsAsync(RequireUserId(), req, ct);
        return NoContent();
    }
}
