using Amori.Api.Features.VoiceNotes.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.VoiceNotes.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.VoiceNotes;

/// <summary>
/// Voice note management. Files are stored in S3; only metadata is stored here.
/// </summary>
[ApiController]
[Route("api/voice-notes")]
[Authorize]
public sealed class VoiceNotesController(
    IVoiceNoteService voiceNoteService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>List all voice notes for the authenticated user's relationship.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<VoiceNoteResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await voiceNoteService.GetAllAsync(RequireUserId(), ct));

    /// <summary>Get a voice note by ID.</summary>
    [HttpGet("{voiceNoteId:guid}")]
    [ProducesResponseType(typeof(VoiceNoteResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid voiceNoteId, CancellationToken ct) =>
        Ok(await voiceNoteService.GetByIdAsync(RequireUserId(), voiceNoteId, ct));

    /// <summary>Create a voice note entry (after the file is uploaded to S3).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(VoiceNoteResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateVoiceNoteRequest req, CancellationToken ct)
    {
        var result = await voiceNoteService.CreateAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetById), new { voiceNoteId = result.Id }, result);
    }

    /// <summary>Update title or category of a voice note.</summary>
    [HttpPatch("{voiceNoteId:guid}")]
    [ProducesResponseType(typeof(VoiceNoteResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid voiceNoteId, [FromBody] UpdateVoiceNoteRequest req, CancellationToken ct) =>
        Ok(await voiceNoteService.UpdateAsync(RequireUserId(), voiceNoteId, req, ct));

    /// <summary>Soft-delete a voice note.</summary>
    [HttpDelete("{voiceNoteId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid voiceNoteId, CancellationToken ct)
    {
        await voiceNoteService.DeleteAsync(RequireUserId(), voiceNoteId, ct);
        return NoContent();
    }

    /// <summary>Favorite a voice note.</summary>
    [HttpPost("{voiceNoteId:guid}/favorite")]
    [ProducesResponseType(typeof(VoiceNoteResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Favorite(Guid voiceNoteId, CancellationToken ct) =>
        Ok(await voiceNoteService.FavoriteAsync(RequireUserId(), voiceNoteId, ct));

    /// <summary>Unfavorite a voice note.</summary>
    [HttpDelete("{voiceNoteId:guid}/favorite")]
    [ProducesResponseType(typeof(VoiceNoteResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Unfavorite(Guid voiceNoteId, CancellationToken ct) =>
        Ok(await voiceNoteService.UnfavoriteAsync(RequireUserId(), voiceNoteId, ct));
}
