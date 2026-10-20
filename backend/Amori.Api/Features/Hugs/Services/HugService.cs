using Amori.Api.Common.Time;
using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Features.Hugs.DTOs;
using Amori.Api.Common.Responses;
using Amori.Api.Domain.Enums;
using Amori.Api.Features.Notifications;
using Amori.Api.Features.Notifications.Services;
using Amori.Api.Features.Users.Services;
using Amori.Api.Infrastructure.Relationships;
using Microsoft.EntityFrameworkCore;

namespace Amori.Api.Features.Hugs.Services;

public sealed class HugService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess,
    INotificationService notifications,
    IRewardService rewards,
    IClientLocalTimeAccessor localTime) : IHugService
{
    private const string NotificationType = NotificationTypes.Hug;

    /// <summary>
    /// A hold this long or longer counts as holding the hug rather than tapping
    /// it, and earns the extra points on top of sending.
    /// </summary>
    private const int HeldThresholdMs = 3_000;

    /// <summary>
    /// Ten minutes. Anything longer is a stuck button or a fabricated value, so
    /// it's clamped rather than rejected — a nonsense duration shouldn't cost
    /// someone their hug.
    /// </summary>
    private const int MaxHoldDurationMs = 600_000;

    /// <summary>
    /// Maps a hug that earned nothing.
    /// </summary>
    /// <remarks>
    /// A separate overload rather than an optional parameter, because optional
    /// arguments are illegal inside the EF expression trees in the queries
    /// below — the same reason <c>MoodService</c> splits its mapper.
    /// </remarks>
    private static HugResponse Map(Hug h) => Map(h, RewardsResponse.None);

    private static HugResponse Map(Hug h, RewardsResponse rewards) => new()
    {
        Id = h.Id, RelationshipId = h.RelationshipId,
        SenderId = h.SenderId, SenderName = h.Sender?.DisplayName ?? string.Empty,
        RecipientId = h.RecipientId, RecipientName = h.Recipient?.DisplayName ?? string.Empty,
        Whisper = h.Whisper,
        HoldDurationMs = h.HoldDurationMs,
        IsAcknowledged = h.AcknowledgedAt.HasValue,
        AcknowledgedAt = h.AcknowledgedAt, CreatedAt = h.CreatedAt,
        Rewards = rewards
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
        var holdDuration = request.HoldDurationMs is { } held
            ? Math.Clamp(held, 0, MaxHoldDurationMs)
            : (int?)null;

        var hug = new Hug
        {
            RelationshipId = rel.Id,
            SenderId = userId,
            RecipientId = partner.Id,
            Whisper = whisper,
            HoldDurationMs = holdDuration,
            // Both partners' time zones at send time, for Long Distance Hugger.
            // Null when a device hasn't reported one, which never counts.
            SenderUtcOffsetMinutes = localTime.Current.WasReported
                ? localTime.Current.UtcOffsetMinutes
                : null,
            RecipientUtcOffsetMinutes = partner.LastKnownUtcOffsetMinutes,
        };
        db.Hugs.Add(hug);
        await db.SaveChangesAsync(ct);
        hug.Sender = (await db.Users.FindAsync([userId], ct))!;
        hug.Recipient = partner;

        // The hug is safely saved, so now credit it. GrantAsync never throws:
        // a points failure must not turn a delivered hug into an error.
        var earned = await rewards.GrantAsync(userId, RewardRequest.For(ActivityType.HugSent, hug.Id), ct);

        // A lingering hug is worth more than a tap.
        if (holdDuration >= HeldThresholdMs)
        {
            var heldReward = await rewards.GrantAsync(
                userId, RewardRequest.For(ActivityType.HugHeld, hug.Id), ct);
            earned = Combine(earned, heldReward);
        }

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

        return Map(hug, earned);
    }

    /// <summary>
    /// Merge two grants from the same action into one envelope, so a hug that
    /// both sends and holds reports a single combined total rather than making
    /// the client add them up.
    /// </summary>
    private static RewardsResponse Combine(RewardsResponse first, RewardsResponse second)
    {
        if (!second.HasAnything) return first;
        if (!first.HasAnything) return second;

        return new RewardsResponse
        {
            PointsAwarded = first.PointsAwarded + second.PointsAwarded,
            // The later grant saw the newer total and level.
            TotalPoints = second.TotalPoints ?? first.TotalPoints,
            LeveledUp = first.LeveledUp || second.LeveledUp,
            NewLevel = second.NewLevel ?? first.NewLevel,
            NewBadges = [.. first.NewBadges, .. second.NewBadges],
        };
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
        if (hug.RelationshipId != rel.Id) throw new ForbiddenException();
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
        if (hug.RelationshipId != rel.Id) throw new ForbiddenException();
        if (hug.RecipientId != userId) throw new ForbiddenException("Only the recipient can acknowledge a hug.");

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
