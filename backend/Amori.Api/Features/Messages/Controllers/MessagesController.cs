using Amori.Api.Features.Messages.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Messages.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Messages;

/// <summary>Personal messages between partners.</summary>
[ApiController]
[Route("api/messages")]
[Authorize]
public sealed class MessagesController(
    IMessageService messageService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>List all messages in the authenticated user's relationship.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<MessageResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessages(CancellationToken ct) =>
        Ok(await messageService.GetMessagesAsync(RequireUserId(), ct));

    /// <summary>Get a message by ID.</summary>
    [HttpGet("{messageId:guid}")]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessage(Guid messageId, CancellationToken ct) =>
        Ok(await messageService.GetMessageAsync(RequireUserId(), messageId, ct));

    /// <summary>Send a message to your partner.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest req, CancellationToken ct)
    {
        var result = await messageService.SendMessageAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetMessage), new { messageId = result.Id }, result);
    }

    /// <summary>Update a message (sender only).</summary>
    [HttpPatch("{messageId:guid}")]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateMessage(Guid messageId, [FromBody] UpdateMessageRequest req, CancellationToken ct) =>
        Ok(await messageService.UpdateMessageAsync(RequireUserId(), messageId, req, ct));

    /// <summary>Delete a message (soft-delete, sender only).</summary>
    [HttpDelete("{messageId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteMessage(Guid messageId, CancellationToken ct)
    {
        await messageService.DeleteMessageAsync(RequireUserId(), messageId, ct);
        return NoContent();
    }

    /// <summary>Mark a message as read (recipient only).</summary>
    [HttpPost("{messageId:guid}/read")]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkRead(Guid messageId, CancellationToken ct) =>
        Ok(await messageService.MarkReadAsync(RequireUserId(), messageId, ct));

    /// <summary>Favorite a message.</summary>
    [HttpPost("{messageId:guid}/favorite")]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Favorite(Guid messageId, CancellationToken ct) =>
        Ok(await messageService.FavoriteAsync(RequireUserId(), messageId, ct));

    /// <summary>Unfavorite a message.</summary>
    [HttpDelete("{messageId:guid}/favorite")]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Unfavorite(Guid messageId, CancellationToken ct) =>
        Ok(await messageService.UnfavoriteAsync(RequireUserId(), messageId, ct));
}
