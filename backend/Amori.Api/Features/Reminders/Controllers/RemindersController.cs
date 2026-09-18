using Amori.Api.Features.Reminders.DTOs;
using Amori.Api.Common.Exceptions;
using Amori.Api.Features.Reminders.Services;
using Amori.Api.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amori.Api.Features.Reminders;

/// <summary>Medication, water, food and custom reminders for the authenticated user.</summary>
[ApiController]
[Route("api/reminders")]
[Authorize]
public sealed class RemindersController(
    IReminderService reminderService,
    ICurrentUserService currentUser) : ControllerBase
{
    private Guid RequireUserId() =>
        currentUser.UserId ?? throw new UnauthorizedException();

    /// <summary>List all reminders for the authenticated user.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ReminderResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReminders(CancellationToken ct) =>
        Ok(await reminderService.GetRemindersAsync(RequireUserId(), ct));

    /// <summary>Get a reminder by ID.</summary>
    [HttpGet("{reminderId:guid}")]
    [ProducesResponseType(typeof(ReminderResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReminder(Guid reminderId, CancellationToken ct) =>
        Ok(await reminderService.GetReminderAsync(RequireUserId(), reminderId, ct));

    /// <summary>Create a new reminder.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ReminderResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateReminder([FromBody] CreateReminderRequest req, CancellationToken ct)
    {
        var result = await reminderService.CreateReminderAsync(RequireUserId(), req, ct);
        return CreatedAtAction(nameof(GetReminder), new { reminderId = result.Id }, result);
    }

    /// <summary>Update a reminder.</summary>
    [HttpPatch("{reminderId:guid}")]
    [ProducesResponseType(typeof(ReminderResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateReminder(Guid reminderId, [FromBody] UpdateReminderRequest req, CancellationToken ct) =>
        Ok(await reminderService.UpdateReminderAsync(RequireUserId(), reminderId, req, ct));

    /// <summary>Delete a reminder.</summary>
    [HttpDelete("{reminderId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteReminder(Guid reminderId, CancellationToken ct)
    {
        await reminderService.DeleteReminderAsync(RequireUserId(), reminderId, ct);
        return NoContent();
    }

    /// <summary>Mark a reminder as complete.</summary>
    [HttpPost("{reminderId:guid}/complete")]
    [ProducesResponseType(typeof(ReminderResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Complete(Guid reminderId, CancellationToken ct) =>
        Ok(await reminderService.CompleteAsync(RequireUserId(), reminderId, ct));

    /// <summary>Skip today's occurrence of a reminder.</summary>
    [HttpPost("{reminderId:guid}/skip")]
    [ProducesResponseType(typeof(ReminderResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Skip(Guid reminderId, CancellationToken ct) =>
        Ok(await reminderService.SkipAsync(RequireUserId(), reminderId, ct));

    /// <summary>Snooze a reminder.</summary>
    [HttpPost("{reminderId:guid}/snooze")]
    [ProducesResponseType(typeof(ReminderResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Snooze(Guid reminderId, [FromBody] SnoozeReminderRequest req, CancellationToken ct) =>
        Ok(await reminderService.SnoozeAsync(RequireUserId(), reminderId, req, ct));

    /// <summary>Get reminders due today for the authenticated user.</summary>
    [HttpGet("today")]
    [ProducesResponseType(typeof(IReadOnlyList<ReminderResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetToday(CancellationToken ct) =>
        Ok(await reminderService.GetTodayAsync(RequireUserId(), ct));
}
