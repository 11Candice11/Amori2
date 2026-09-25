using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Domain.Enums;
using Amori.Api.Infrastructure.Relationships;
using Microsoft.EntityFrameworkCore;
using Amori.Api.Features.Emergency.DTOs;
using Amori.Api.Features.Notifications;
using Amori.Api.Features.Notifications.Services;

namespace Amori.Api.Features.Emergency.Services;

public sealed class EmergencyService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess,
    INotificationService notifications) : IEmergencyService
{
    private const string NotificationType = NotificationTypes.Emergency;

    // What the recipient sees for each kind of request.
    private static string DescribeRequest(EmergencyRequestType type, string senderName) => type switch
    {
        EmergencyRequestType.Support => $"{senderName} needs support right now.",
        EmergencyRequestType.Space => $"{senderName} is asking for some space.",
        EmergencyRequestType.Distraction => $"{senderName} could use a distraction.",
        _ => $"{senderName} sent an emergency request.",
    };

    private static EmergencyRequestResponse Map(EmergencyRequest r) => new()
    {
        Id = r.Id, RelationshipId = r.RelationshipId,
        SenderId = r.SenderId, SenderName = r.Sender?.DisplayName ?? string.Empty,
        RecipientId = r.RecipientId, RecipientName = r.Recipient?.DisplayName ?? string.Empty,
        Type = r.Type, Status = r.Status, Message = r.Message,
        CreatedAt = r.CreatedAt, AcknowledgedAt = r.AcknowledgedAt, ResolvedAt = r.ResolvedAt
    };

    private async Task<EmergencyRequest> LoadAsync(Guid userId, Guid requestId, CancellationToken ct)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        var req = await db.EmergencyRequests
            .Include(r => r.Sender).Include(r => r.Recipient)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct)
            ?? throw new NotFoundException("Emergency request", requestId);
        if (req.RelationshipId != rel.Id) throw new UnauthorizedException();
        return req;
    }

    public async Task<EmergencyRequestResponse> CreateAsync(Guid userId, CreateEmergencyRequestDto request, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        var partner = await relAccess.GetPartnerAsync(userId)
            ?? throw new ConflictException("Your relationship does not have a second partner yet.");

        // Respect the recipient's "Allow emergency alerts" permission. Defaults
        // to allowed when they have no settings row yet.
        var partnerAllowsAlerts = await db.UserSettings
            .Where(s => s.UserId == partner.Id)
            .Select(s => (bool?)s.AllowEmergencyAlerts)
            .FirstOrDefaultAsync(ct) ?? true;

        if (!partnerAllowsAlerts)
            throw new ConflictException(
                $"{partner.DisplayName} is not accepting emergency alerts right now.");

        var req = new EmergencyRequest
        {
            RelationshipId = rel.Id, SenderId = userId, RecipientId = partner.Id,
            Type = request.Type, Status = EmergencyRequestStatus.Active, Message = request.Message
        };
        db.EmergencyRequests.Add(req);
        await db.SaveChangesAsync(ct);
        req.Sender = (await db.Users.FindAsync([userId], ct))!;
        req.Recipient = partner;

        // Alert the recipient (in-app bell + best-effort push). CreateAsync never
        // throws, so a notification failure won't fail the request itself.
        var senderName = req.Sender.DisplayName;
        var body = string.IsNullOrWhiteSpace(req.Message)
            ? DescribeRequest(req.Type, senderName)
            : $"{DescribeRequest(req.Type, senderName)} \u201C{req.Message.Trim()}\u201D";
        await notifications.CreateAsync(
            partner.Id,
            "Your partner needs you",
            body,
            notificationType: NotificationType,
            referenceId: req.Id.ToString(),
            ct);

        return Map(req);
    }

    public async Task<IReadOnlyList<EmergencyRequestResponse>> GetAllAsync(Guid userId, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        return await db.EmergencyRequests
            .Include(r => r.Sender).Include(r => r.Recipient)
            .Where(r => r.RelationshipId == rel.Id)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => Map(r)).ToListAsync(ct);
    }

    public async Task<EmergencyRequestResponse> GetByIdAsync(Guid userId, Guid requestId, CancellationToken ct = default)
    {
        return Map(await LoadAsync(userId, requestId, ct));
    }

    public async Task<EmergencyRequestResponse> UpdateAsync(Guid userId, Guid requestId, UpdateEmergencyRequestDto request, CancellationToken ct = default)
    {
        var req = await LoadAsync(userId, requestId, ct);
        if (req.SenderId != userId) throw new UnauthorizedException("Only the sender can update this request.");
        if (req.Status != EmergencyRequestStatus.Active)
            throw new ConflictException("Only active requests can be updated.");
        req.Message = request.Message;
        await db.SaveChangesAsync(ct);
        return Map(req);
    }

    public async Task<EmergencyRequestResponse> AcknowledgeAsync(Guid userId, Guid requestId, CancellationToken ct = default)
    {
        var req = await LoadAsync(userId, requestId, ct);
        if (req.RecipientId != userId) throw new UnauthorizedException("Only the recipient can acknowledge.");
        if (req.Status != EmergencyRequestStatus.Active)
            throw new ConflictException($"Cannot acknowledge a request in '{req.Status}' status.");
        req.Status = EmergencyRequestStatus.Acknowledged;
        req.AcknowledgedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Map(req);
    }

    public async Task<EmergencyRequestResponse> ResolveAsync(Guid userId, Guid requestId, CancellationToken ct = default)
    {
        var req = await LoadAsync(userId, requestId, ct);
        if (req.Status is EmergencyRequestStatus.Resolved or EmergencyRequestStatus.Cancelled)
            throw new ConflictException($"Request is already '{req.Status}'.");
        req.Status = EmergencyRequestStatus.Resolved;
        req.ResolvedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Map(req);
    }

    public async Task<EmergencyRequestResponse> CancelAsync(Guid userId, Guid requestId, CancellationToken ct = default)
    {
        var req = await LoadAsync(userId, requestId, ct);
        if (req.SenderId != userId) throw new UnauthorizedException("Only the sender can cancel.");
        if (req.Status is EmergencyRequestStatus.Resolved or EmergencyRequestStatus.Cancelled)
            throw new ConflictException($"Request is already '{req.Status}'.");
        req.Status = EmergencyRequestStatus.Cancelled;
        await db.SaveChangesAsync(ct);
        return Map(req);
    }
}
