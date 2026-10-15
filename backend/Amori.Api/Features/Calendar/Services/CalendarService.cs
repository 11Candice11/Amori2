using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Infrastructure.Relationships;
using Amori.Api.Features.Notifications;
using Amori.Api.Features.Notifications.Services;
using Microsoft.EntityFrameworkCore;
using Amori.Api.Features.Calendar.DTOs;

namespace Amori.Api.Features.Calendar.Services;

public sealed class CalendarService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess,
    INotificationService notifications) : ICalendarService
{
    private static CalendarEventResponse Map(CalendarEvent e) => new()
    {
        Id = e.Id, RelationshipId = e.RelationshipId,
        CreatedByUserId = e.CreatedByUserId, CreatedByName = e.CreatedBy?.DisplayName ?? string.Empty,
        Title = e.Title, Description = e.Description, EventDate = e.EventDate,
        StartTime = e.StartTime, EndTime = e.EndTime, Location = e.Location,
        ReminderEnabled = e.ReminderEnabled, ReminderMinutesBefore = e.ReminderMinutesBefore,
        IsCompleted = e.IsCompleted, CompletedAt = e.CompletedAt,
        IsShared = e.IsShared, Recurrence = e.Recurrence,
        CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt
    };

    private async Task<(Guid relId, CalendarEvent ev)> LoadAsync(Guid userId, Guid eventId, CancellationToken ct)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        var ev = await db.CalendarEvents.Include(e => e.CreatedBy)
            .FirstOrDefaultAsync(e => e.Id == eventId, ct)
            ?? throw new NotFoundException("Calendar event", eventId);
        if (ev.RelationshipId != rel.Id) throw new ForbiddenException();
        return (rel.Id, ev);
    }

    public async Task<IReadOnlyList<CalendarEventResponse>> GetAllAsync(Guid userId, int? year, int? month, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        var query = db.CalendarEvents.Include(e => e.CreatedBy)
            .Where(e => e.RelationshipId == rel.Id);

        if (year.HasValue && month.HasValue)
        {
            var from = new DateOnly(year.Value, month.Value, 1);
            var to = from.AddMonths(1);
            query = query.Where(e => e.EventDate >= from && e.EventDate < to);
        }

        return await query.OrderBy(e => e.EventDate).ThenBy(e => e.StartTime)
            .Select(e => Map(e)).ToListAsync(ct);
    }

    public async Task<CalendarEventResponse> GetByIdAsync(Guid userId, Guid eventId, CancellationToken ct = default)
    {
        var (_, ev) = await LoadAsync(userId, eventId, ct);
        return Map(ev);
    }

    public async Task<CalendarEventResponse> CreateAsync(Guid userId, CreateCalendarEventRequest request, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        if (string.IsNullOrWhiteSpace(request.Title)) throw new ValidationException("Title is required.");

        var ev = new CalendarEvent
        {
            RelationshipId = rel.Id, CreatedByUserId = userId,
            Title = request.Title.Trim(), Description = request.Description,
            EventDate = request.EventDate, StartTime = request.StartTime, EndTime = request.EndTime,
            Location = request.Location, ReminderEnabled = request.ReminderEnabled,
            ReminderMinutesBefore = request.ReminderMinutesBefore, IsShared = request.IsShared,
            Recurrence = request.Recurrence
        };
        db.CalendarEvents.Add(ev);
        await db.SaveChangesAsync(ct);
        ev.CreatedBy = (await db.Users.FindAsync([userId], ct))!;

        // Notify the partner that a new event was added
        await NotifyPartnerAsync(userId, ev, ct);

        return Map(ev);
    }

    /// <summary>
    /// Notify the partner that a new calendar event was added to the shared calendar.
    /// Best-effort; does not throw if notification dispatch fails.
    /// </summary>
    private async Task NotifyPartnerAsync(Guid creatorId, CalendarEvent calendarEvent, CancellationToken ct = default)
    {
        try
        {
            // Find the partner (the other member of the relationship)
            var partner = await db.RelationshipMembers
                .Where(rm => rm.RelationshipId == calendarEvent.RelationshipId && rm.UserId != creatorId)
                .Select(rm => rm.User)
                .FirstOrDefaultAsync(ct);

            if (partner == null)
                return; // No partner yet

            var creatorName = calendarEvent.CreatedBy?.DisplayName ?? "Your partner";
            var dateStr = calendarEvent.EventDate.ToString("MMM d");
            var body = $"{creatorName} added an event: {calendarEvent.Title}";

            await notifications.CreateAsync(
                partner.Id,
                $"New calendar event 📅 ({dateStr})",
                body,
                notificationType: NotificationTypes.CalendarEventAdded,
                referenceId: calendarEvent.Id.ToString(),
                ct: ct);
        }
        catch (Exception ex)
        {
            // Log but don't throw — notification failures shouldn't break event creation
            System.Diagnostics.Debug.WriteLine($"Calendar event notification failed: {ex.Message}");
        }
    }

    public async Task<CalendarEventResponse> UpdateAsync(Guid userId, Guid eventId, UpdateCalendarEventRequest request, CancellationToken ct = default)
    {
        var (_, ev) = await LoadAsync(userId, eventId, ct);
        if (ev.CreatedByUserId != userId) throw new ForbiddenException("Only the creator can update this event.");
        if (request.Title != null) ev.Title = request.Title.Trim();
        if (request.Description != null) ev.Description = request.Description;
        if (request.EventDate.HasValue) ev.EventDate = request.EventDate.Value;
        if (request.StartTime.HasValue) ev.StartTime = request.StartTime;
        if (request.EndTime.HasValue) ev.EndTime = request.EndTime;
        if (request.Location != null) ev.Location = request.Location;
        if (request.ReminderEnabled.HasValue) ev.ReminderEnabled = request.ReminderEnabled.Value;
        if (request.ReminderMinutesBefore.HasValue) ev.ReminderMinutesBefore = request.ReminderMinutesBefore;
        if (request.IsShared.HasValue) ev.IsShared = request.IsShared.Value;
        if (request.Recurrence.HasValue) ev.Recurrence = request.Recurrence.Value;
        await db.SaveChangesAsync(ct);
        return Map(ev);
    }

    public async Task DeleteAsync(Guid userId, Guid eventId, CancellationToken ct = default)
    {
        var (_, ev) = await LoadAsync(userId, eventId, ct);
        if (ev.CreatedByUserId != userId) throw new ForbiddenException("Only the creator can delete this event.");
        db.CalendarEvents.Remove(ev);
        await db.SaveChangesAsync(ct);
    }

    public async Task<CalendarEventResponse> CompleteAsync(Guid userId, Guid eventId, CancellationToken ct = default)
    {
        var (_, ev) = await LoadAsync(userId, eventId, ct);
        ev.IsCompleted = true;
        ev.CompletedAt ??= DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Map(ev);
    }
}
