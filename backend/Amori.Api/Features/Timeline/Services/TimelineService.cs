using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Infrastructure.Relationships;
using Amori.Api.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Amori.Api.Features.Timeline.DTOs;

namespace Amori.Api.Features.Timeline.Services;

public sealed class TimelineService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess,
    IFileStorageService storage) : ITimelineService
{
    private TimelineEventResponse Map(TimelineEvent e) => new()
    {
        Id = e.Id, RelationshipId = e.RelationshipId,
        CreatedByUserId = e.CreatedByUserId, CreatedByName = e.CreatedBy?.DisplayName ?? string.Empty,
        Title = e.Title, Description = e.Description, EventDate = e.EventDate,
        Location = e.Location, Latitude = e.Latitude, Longitude = e.Longitude,
        EventType = e.EventType, PhotoKeys = e.PhotoKeys,
        Photos = e.PhotoKeys
            .Select(key => new TimelinePhotoResponse { PhotoKey = key, Url = storage.GetPublicUrl(key) })
            .ToList(),
        CreatedAt = e.CreatedAt, UpdatedAt = e.UpdatedAt
    };

    /// <summary>
    /// Whether a user shares their timeline contributions with their partner.
    /// Defaults to shared when they have no settings row yet.
    /// </summary>
    private async Task<bool> SharesTimelineAsync(Guid authorId, CancellationToken ct) =>
        await db.UserSettings
            .Where(s => s.UserId == authorId)
            .Select(s => (bool?)s.ShareTimeline)
            .FirstOrDefaultAsync(ct) ?? true;

    private async Task<TimelineEvent> LoadAsync(Guid userId, Guid eventId, CancellationToken ct)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        var ev = await db.TimelineEvents.Include(e => e.CreatedBy)
            .FirstOrDefaultAsync(e => e.Id == eventId, ct)
            ?? throw new NotFoundException("Timeline event", eventId);
        if (ev.RelationshipId != rel.Id) throw new UnauthorizedException();

        // Respect the author's "Share timeline" setting. Their own events always
        // stay visible to them; for the partner a withheld event reads as absent.
        if (ev.CreatedByUserId != userId && !await SharesTimelineAsync(ev.CreatedByUserId, ct))
            throw new NotFoundException("Timeline event", eventId);

        return ev;
    }

    public async Task<IReadOnlyList<TimelineEventResponse>> GetAllAsync(Guid userId, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        // Drop the partner's contributions when they've turned off timeline
        // sharing. The caller's own events are never filtered.
        var partner = await relAccess.GetPartnerAsync(userId);
        var hidePartnerEvents = partner != null && !await SharesTimelineAsync(partner.Id, ct);

        var events = await db.TimelineEvents.Include(e => e.CreatedBy)
            .Where(e => e.RelationshipId == rel.Id)
            .Where(e => !hidePartnerEvents || e.CreatedByUserId == userId)
            .OrderBy(e => e.EventDate)
            .ToListAsync(ct);
        // Map in memory: resolving photo keys to URLs calls into storage, which
        // can't be translated to SQL.
        return events.Select(Map).ToList();
    }

    public async Task<TimelineEventResponse> GetByIdAsync(Guid userId, Guid eventId, CancellationToken ct = default) =>
        Map(await LoadAsync(userId, eventId, ct));

    public async Task<TimelineEventResponse> CreateAsync(Guid userId, CreateTimelineEventRequest request, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        if (string.IsNullOrWhiteSpace(request.Title)) throw new ValidationException("Title is required.");

        var ev = new TimelineEvent
        {
            RelationshipId = rel.Id, CreatedByUserId = userId,
            Title = request.Title.Trim(), Description = request.Description,
            EventDate = request.EventDate, Location = request.Location,
            Latitude = request.Latitude, Longitude = request.Longitude,
            EventType = request.EventType, PhotoKeys = request.PhotoKeys
        };
        db.TimelineEvents.Add(ev);
        await db.SaveChangesAsync(ct);
        ev.CreatedBy = (await db.Users.FindAsync([userId], ct))!;
        return Map(ev);
    }

    public async Task<TimelineEventResponse> UpdateAsync(Guid userId, Guid eventId, UpdateTimelineEventRequest request, CancellationToken ct = default)
    {
        var ev = await LoadAsync(userId, eventId, ct);
        if (ev.CreatedByUserId != userId) throw new UnauthorizedException("Only the creator can update this event.");
        if (request.Title != null) ev.Title = request.Title.Trim();
        if (request.Description != null) ev.Description = request.Description;
        if (request.EventDate.HasValue) ev.EventDate = request.EventDate.Value;
        if (request.Location != null) ev.Location = request.Location;
        if (request.Latitude.HasValue) ev.Latitude = request.Latitude;
        if (request.Longitude.HasValue) ev.Longitude = request.Longitude;
        if (request.EventType.HasValue) ev.EventType = request.EventType.Value;
        await db.SaveChangesAsync(ct);
        return Map(ev);
    }

    public async Task DeleteAsync(Guid userId, Guid eventId, CancellationToken ct = default)
    {
        var ev = await LoadAsync(userId, eventId, ct);
        if (ev.CreatedByUserId != userId) throw new UnauthorizedException("Only the creator can delete this event.");
        db.TimelineEvents.Remove(ev);
        await db.SaveChangesAsync(ct);
    }

    public async Task<TimelineEventResponse> AddMediaAsync(Guid userId, Guid eventId, AddTimelineMediaRequest request, CancellationToken ct = default)
    {
        var ev = await LoadAsync(userId, eventId, ct);
        if (ev.CreatedByUserId != userId) throw new UnauthorizedException("Only the creator can add photos to this event.");
        if (string.IsNullOrWhiteSpace(request.PhotoKey)) throw new ValidationException("PhotoKey is required.");
        // Reassign (rather than mutate in place) so EF's change tracker reliably
        // detects the JSONB column change — an in-place List.Add can be missed.
        ev.PhotoKeys = [.. ev.PhotoKeys, request.PhotoKey];
        await db.SaveChangesAsync(ct);
        return Map(ev);
    }

    public async Task<TimelineEventResponse> RemoveMediaAsync(Guid userId, Guid eventId, string photoKey, CancellationToken ct = default)
    {
        var ev = await LoadAsync(userId, eventId, ct);
        if (ev.CreatedByUserId != userId) throw new UnauthorizedException("Only the creator can remove photos from this event.");
        if (string.IsNullOrWhiteSpace(photoKey)) throw new ValidationException("PhotoKey is required.");
        // Reassign the list so EF's change tracker sees the JSONB column change.
        ev.PhotoKeys = ev.PhotoKeys.Where(k => k != photoKey).ToList();
        await db.SaveChangesAsync(ct);
        return Map(ev);
    }
}
