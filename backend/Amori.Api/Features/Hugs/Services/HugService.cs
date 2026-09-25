using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Features.Hugs.DTOs;
using Amori.Api.Features.Notifications;
using Amori.Api.Features.Notifications.Services;
using Amori.Api.Infrastructure.Relationships;
using Microsoft.EntityFrameworkCore;

namespace Amori.Api.Features.Hugs.Services;

public sealed class HugService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess,
    INotificationService notifications) : IHugService
{
    private const string NotificationType = NotificationTypes.Hug;
    private static HugResponse Map(Hug h) => new()
    {
        Id = h.Id, RelationshipId = h.RelationshipId,
        SenderId = h.SenderId, SenderName = h.Sender?.DisplayName ?? string.Empty,
        RecipientId = h.RecipientId, RecipientName = h.Recipient?.DisplayName ?? string.Empty,
        Whisper = h.Whisper,
        IsAcknowledged = h.AcknowledgedAt.HasValue,
        AcknowledgedAt = h.AcknowledgedAt, CreatedAt = h.CreatedAt
    };

    public async Task<HugResponse> SendHugAsync(Guid userId, SendHugRequest request, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        var partner = await relAccess.GetPartnerAsync(userId)
            ?? throw new ConflictException("Your relationship does not have a second partner yet.");

        // Respect the recipient's "Allow hugs" permission. Defaults to allowed
        // when they have no settings row yet.
        var partnerAllowsHugs = await db.UserSettings
            .Where(s => s.UserId == partner.Id)
            .Select(s => (bool?)s.AllowHugs)
            .FirstOrDefaultAsync(ct) ?? true;

        if (!partnerAllowsHugs)
            throw new ConflictException($"{partner.DisplayName} is not accepting hugs right now.");

        var whisper = string.IsNullOrWhiteSpace(request.Whisper) ? null : request.Whisper.Trim();
        var hug = new Hug { RelationshipId = rel.Id, SenderId = userId, RecipientId = partner.Id, Whisper = whisper };
        db.Hugs.Add(hug);
        await db.SaveChangesAsync(ct);
        hug.Sender = (await db.Users.FindAsync([userId], ct))!;
        hug.Recipient = partner;

        // Notify the recipient (in-app bell + best-effort push). CreateAsync
        // never throws, so a notification failure won't fail the hug send.
        var senderName = hug.Sender.DisplayName;
        var body = whisper is null
            ? $"{senderName} sent you a hug."
            : $"{senderName} sent you a hug: \u201C{whisper}\u201D";
        await notifications.CreateAsync(
            partner.Id,
            "You've got a hug \u2764",
            body,
            notificationType: NotificationType,
            referenceId: hug.Id.ToString(),
            ct);

        return Map(hug);
    }

    public async Task<IReadOnlyList<HugResponse>> GetHugsAsync(Guid userId, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        return await db.Hugs
            .Include(h => h.Sender).Include(h => h.Recipient)
            .Where(h => h.RelationshipId == rel.Id)
            .OrderByDescending(h => h.CreatedAt)
            .Select(h => Map(h)).ToListAsync(ct);
    }

    public async Task<HugResponse> GetHugAsync(Guid userId, Guid hugId, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        var hug = await db.Hugs
            .Include(h => h.Sender).Include(h => h.Recipient)
            .FirstOrDefaultAsync(h => h.Id == hugId, ct)
            ?? throw new NotFoundException("Hug", hugId);
        if (hug.RelationshipId != rel.Id) throw new UnauthorizedException();
        return Map(hug);
    }

    public async Task<HugResponse> AcknowledgeAsync(Guid userId, Guid hugId, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        var hug = await db.Hugs
            .Include(h => h.Sender).Include(h => h.Recipient)
            .FirstOrDefaultAsync(h => h.Id == hugId, ct)
            ?? throw new NotFoundException("Hug", hugId);
        if (hug.RelationshipId != rel.Id) throw new UnauthorizedException();
        if (hug.RecipientId != userId) throw new UnauthorizedException("Only the recipient can acknowledge a hug.");

        var wasAlreadyAcknowledged = hug.AcknowledgedAt.HasValue;
        hug.AcknowledgedAt ??= DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        // Let the original sender know their hug was held — only on the first ack.
        if (!wasAlreadyAcknowledged)
        {
            var holderName = hug.Recipient?.DisplayName ?? "Your partner";
            await notifications.CreateAsync(
                hug.SenderId,
                "Your hug was held \u2764",
                $"{holderName} held the hug you sent.",
                notificationType: NotificationType,
                referenceId: hug.Id.ToString(),
                ct);
        }

        return Map(hug);
    }
}
