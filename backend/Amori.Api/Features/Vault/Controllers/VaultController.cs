using Amori.Api.Features.Vault.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Vault.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Vault.Controllers;

/// <summary>
/// The Hearth Vault — the caller's own saved daily gifts.
///
/// Every route reads and writes only the authenticated user's vault, so a
/// partner cannot see or remove what the other has saved.
/// </summary>
[ApiController]
[Route("api/vault")]
[Authorize]
public sealed class VaultController(
    IVaultService vaultService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>Get the caller's saved gifts, most recently saved first.</summary>
    [HttpGet("gifts")]
    [ProducesResponseType(typeof(IReadOnlyList<VaultGiftResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGifts(CancellationToken ct) =>
        Ok(await vaultService.GetGiftsAsync(RequireUserId(), ct));

    /// <summary>Get a single saved gift from the caller's vault.</summary>
    [HttpGet("gifts/{giftId:guid}")]
    [ProducesResponseType(typeof(VaultGiftResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetGiftById(Guid giftId, CancellationToken ct) =>
        Ok(await vaultService.GetGiftByIdAsync(RequireUserId(), giftId, ct));

    /// <summary>Save one of the relationship's memories to the caller's vault.</summary>
    [HttpPost("gifts")]
    [ProducesResponseType(typeof(VaultGiftResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> SaveGift([FromBody] SaveVaultGiftRequest req, CancellationToken ct)
    {
        var result = await vaultService.SaveGiftAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetGiftById), new { giftId = result.Id }, result);
    }

    /// <summary>
    /// Send one of the relationship's memories as a gift to the caller's
    /// partner. It lands in the partner's vault (not the caller's) and notifies
    /// them. Returns a confirmation rather than the gift, since the caller can't
    /// read the partner's private vault.
    /// </summary>
    [HttpPost("gifts/send")]
    [ProducesResponseType(typeof(SendGiftResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> SendGiftToPartner([FromBody] SaveVaultGiftRequest req, CancellationToken ct) =>
        Ok(await vaultService.SendGiftToPartnerAsync(RequireUserId(), req, ct));

    /// <summary>Remove a saved gift from the caller's vault.</summary>
    [HttpDelete("gifts/{giftId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveGift(Guid giftId, CancellationToken ct)
    {
        await vaultService.RemoveGiftAsync(RequireUserId(), giftId, ct);
        return NoContent();
    }
}
