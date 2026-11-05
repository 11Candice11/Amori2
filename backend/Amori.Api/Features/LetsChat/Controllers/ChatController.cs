using Amori.Api.Common.Exceptions;
using Amori.Api.Features.LetsChat.DTOs;
using Amori.Api.Features.LetsChat.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.LetsChat;

/// <summary>Guided "Let's Chat" messages between partners.</summary>
[ApiController]
[Route("api/chat")]
[Authorize]
public sealed class ChatController(
    IChatService chatService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>The catalog of guided templates and their prompt steps.</summary>
    [HttpGet("templates")]
    [ProducesResponseType(typeof(IReadOnlyList<ChatTemplates.ChatTemplateDefinition>), StatusCodes.Status200OK)]
    public IActionResult GetTemplates() => Ok(chatService.GetTemplates());

    /// <summary>List the caller's own drafts plus all messages exchanged with the partner.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ChatConversationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConversations(CancellationToken ct) =>
        Ok(await chatService.GetConversationsAsync(RequireUserId(), ct));

    /// <summary>Get one conversation by id.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ChatConversationResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConversation(Guid id, CancellationToken ct) =>
        Ok(await chatService.GetConversationAsync(RequireUserId(), id, ct));

    /// <summary>Create a new (private) draft conversation.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ChatConversationResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateChatRequest req, CancellationToken ct)
    {
        var result = await chatService.CreateAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetConversation), new { id = result.Id }, result);
    }

    /// <summary>Update a draft (autosave / edit answers). Author only, drafts only.</summary>
    [HttpPatch("{id:guid}")]
    [ProducesResponseType(typeof(ChatConversationResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateChatRequest req, CancellationToken ct) =>
        Ok(await chatService.UpdateAsync(RequireUserId(), id, req, ct));

    /// <summary>Send a completed draft to the partner.</summary>
    [HttpPost("{id:guid}/send")]
    [ProducesResponseType(typeof(ChatConversationResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Send(Guid id, CancellationToken ct) =>
        Ok(await chatService.SendAsync(RequireUserId(), id, ct));

    /// <summary>Mark a received message as read (recipient only).</summary>
    [HttpPost("{id:guid}/read")]
    [ProducesResponseType(typeof(ChatConversationResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct) =>
        Ok(await chatService.MarkReadAsync(RequireUserId(), id, ct));

    /// <summary>Resolve (close) a sent chat with a written resolution. Either partner may do this.</summary>
    [HttpPost("{id:guid}/resolve")]
    [ProducesResponseType(typeof(ChatConversationResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Resolve(Guid id, [FromBody] ResolveChatRequest req, CancellationToken ct) =>
        Ok(await chatService.ResolveAsync(RequireUserId(), id, req, ct));

    /// <summary>Delete an unsent draft (author only).</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await chatService.DeleteAsync(RequireUserId(), id, ct);
        return NoContent();
    }
}
