using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Domain.Enums;
using Amori.Api.Features.Notifications.Services;
using Amori.Api.Features.Relationships.DTOs;
using Amori.Api.Infrastructure.Relationships;
using Microsoft.EntityFrameworkCore;

namespace Amori.Api.Features.Relationships.Services;

public sealed class PartnerLinkService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess,
    INotificationService notifications,
    ILogger<PartnerLinkService> logger) : IPartnerLinkService
{
    private static readonly TimeSpan RequestLifetime = TimeSpan.FromDays(14);

    public async Task<PartnerLinkStatusResponse> GetStatusAsync(Guid userId, CancellationToken ct = default)
    {
        var partner = await relAccess.GetPartnerAsync(userId);

        var user = await db.Users.FindAsync([userId], ct)
            ?? throw new NotFoundException("User", userId);

        var pending = await db.RelationshipInvitations
            .Where(i => i.Status == MemberInviteStatus.Pending && i.ExpiresAt > DateTime.UtcNow)
            .Where(i => i.InvitedByUserId == userId || i.InviteeEmail == user.Email)
            .ToListAsync(ct);

        var incoming = new List<PartnerLinkRequestResponse>();
        var outgoing = new List<PartnerLinkRequestResponse>();

        foreach (var invite in pending)
        {
            if (invite.InvitedByUserId == userId)
            {
                var inviteeName = invite.InviteeEmail is null
                    ? null
                    : await db.Users.Where(u => u.Email == invite.InviteeEmail)
                        .Select(u => u.DisplayName).FirstOrDefaultAsync(ct);

                outgoing.Add(new PartnerLinkRequestResponse
                {
                    Id = invite.Id,
                    Direction = PartnerLinkDirection.Outgoing,
                    OtherPartyName = inviteeName,
                    OtherPartyEmail = invite.InviteeEmail ?? string.Empty,
                    CreatedAt = invite.CreatedAt,
                    ExpiresAt = invite.ExpiresAt
                });
            }
            else
            {
                var inviter = await db.Users.FindAsync([invite.InvitedByUserId], ct);
                incoming.Add(new PartnerLinkRequestResponse
                {
                    Id = invite.Id,
                    Direction = PartnerLinkDirection.Incoming,
                    OtherPartyName = inviter?.DisplayName,
                    OtherPartyEmail = inviter?.Email ?? string.Empty,
                    CreatedAt = invite.CreatedAt,
                    ExpiresAt = invite.ExpiresAt
                });
            }
        }

        return new PartnerLinkStatusResponse
        {
            IsLinked = partner is not null,
            PartnerName = partner?.DisplayName,
            IncomingRequests = incoming,
            OutgoingRequests = outgoing
        };
    }

    public async Task<PartnerLinkRequestResponse> SendRequestAsync(Guid userId, SendPartnerLinkRequest request, CancellationToken ct = default)
    {
        var email = request.Email?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
            throw new ValidationException("A partner email is required.");

        var user = await db.Users.FindAsync([userId], ct)
            ?? throw new NotFoundException("User", userId);

        if (string.Equals(email, user.Email, StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("You can't link to your own account.");

        // Already linked to a real partner?
        if (await relAccess.GetPartnerAsync(userId) is not null)
            throw new ConflictException("You're already linked with a partner.");

        var invitee = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct)
            ?? throw new NotFoundException($"No account was found for '{email}'. Ask your partner to sign up first.");

        // Is the invitee already linked to someone?
        if (await relAccess.GetPartnerAsync(invitee.Id) is not null)
            throw new ConflictException("That person is already linked with a partner.");

        // Reuse the caller's existing (solo) relationship, or create one now so
        // there's something concrete to link into on accept.
        var relationship = await relAccess.GetUserRelationshipAsync(userId)
            ?? await CreateSoloRelationshipAsync(userId, ct);

        // Avoid duplicate pending requests to the same person.
        var existing = await db.RelationshipInvitations.FirstOrDefaultAsync(
            i => i.InvitedByUserId == userId
                 && i.InviteeEmail == email
                 && i.Status == MemberInviteStatus.Pending,
            ct);

        if (existing is not null)
        {
            existing.ExpiresAt = DateTime.UtcNow.Add(RequestLifetime);
            await db.SaveChangesAsync(ct);
            await NotifyLinkRequestAsync(invitee.Id, user.DisplayName, existing.Id, ct);
            return ToResponse(existing, PartnerLinkDirection.Outgoing, invitee.DisplayName, email);
        }

        var invitation = new RelationshipInvitation
        {
            RelationshipId = relationship.Id,
            InvitedByUserId = userId,
            InviteeEmail = email,
            InviteCode = GenerateInviteCode(),
            Status = MemberInviteStatus.Pending,
            ExpiresAt = DateTime.UtcNow.Add(RequestLifetime)
        };

        db.RelationshipInvitations.Add(invitation);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("User {UserId} sent a partner link request to {Email}", userId, email);

        await NotifyLinkRequestAsync(invitee.Id, user.DisplayName, invitation.Id, ct);

        return ToResponse(invitation, PartnerLinkDirection.Outgoing, invitee.DisplayName, email);
    }

    public async Task<RelationshipResponse> AcceptRequestAsync(Guid userId, Guid requestId, AcceptPartnerLinkRequest request, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct)
            ?? throw new NotFoundException("User", userId);

        var invitation = await db.RelationshipInvitations.FindAsync([requestId], ct)
            ?? throw new NotFoundException("Link request", requestId);

        // Only the invitee may accept.
        if (!string.Equals(invitation.InviteeEmail, user.Email, StringComparison.OrdinalIgnoreCase))
            throw new ForbiddenException();

        if (invitation.Status != MemberInviteStatus.Pending)
            throw new ConflictException("This link request is no longer pending.");

        if (invitation.ExpiresAt <= DateTime.UtcNow)
            throw new ConflictException("This link request has expired.");

        if (await relAccess.GetPartnerAsync(userId) is not null)
            throw new ConflictException("You're already linked with a partner.");

        var targetRelationship = await db.Relationships.FindAsync([invitation.RelationshipId], ct)
            ?? throw new NotFoundException("Relationship", invitation.RelationshipId);

        if (await db.RelationshipMembers.CountAsync(m => m.RelationshipId == targetRelationship.Id, ct) >= 2)
            throw new ConflictException("The inviter's relationship is already full.");

        // If the accepter is already in their own (solo) relationship, merge its
        // data into the inviter's relationship, then remove the empty one.
        // MergeRelationshipsAsync clears the change tracker, so any entities we
        // loaded above become detached — we re-fetch them afterwards.
        var myRelationship = await relAccess.GetUserRelationshipAsync(userId);
        var merged = myRelationship is not null && myRelationship.Id != targetRelationship.Id;
        if (merged)
        {
            await MergeRelationshipsAsync(myRelationship!.Id, targetRelationship.Id, ct);

            // Re-attach after the merge cleared the change tracker.
            targetRelationship = await db.Relationships.FindAsync([targetRelationship.Id], ct)
                ?? throw new NotFoundException("Relationship", targetRelationship.Id);
            invitation = await db.RelationshipInvitations.FindAsync([requestId], ct)
                ?? throw new NotFoundException("Link request", requestId);
        }
        else
        {
            db.RelationshipMembers.Add(new RelationshipMember
            {
                RelationshipId = targetRelationship.Id,
                UserId = userId,
                Role = RelationshipRole.Member,
                InviteStatus = MemberInviteStatus.Accepted
            });
        }

        // Seed the relationship's anniversary from the accepter's chosen start
        // date so the dashboard's "days together" count is accurate.
        if (request.StartDate is { } startDate)
            targetRelationship.AnniversaryDate = startDate;

        invitation.Status = MemberInviteStatus.Accepted;
        invitation.RespondedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        logger.LogInformation("User {UserId} accepted link request {RequestId} into relationship {RelationshipId}",
            userId, requestId, targetRelationship.Id);

        await notifications.CreateAsync(
            invitation.InvitedByUserId,
            "You're linked!",
            $"{user.DisplayName} accepted your partner link request.",
            notificationType: "PartnerLinkAccepted",
            referenceId: targetRelationship.Id.ToString(),
            ct);

        var members = await relAccess.GetMembersAsync(targetRelationship.Id);
        return new RelationshipResponse
        {
            Id = targetRelationship.Id,
            StartDate = targetRelationship.AnniversaryDate,
            IsActive = targetRelationship.Status == RelationshipStatus.Active,
            Members = members.Select(m => new RelationshipMemberResponse { Id = m.Id, Name = m.DisplayName }).ToList()
        };
    }

    public async Task DeclineRequestAsync(Guid userId, Guid requestId, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct)
            ?? throw new NotFoundException("User", userId);

        var invitation = await db.RelationshipInvitations.FindAsync([requestId], ct)
            ?? throw new NotFoundException("Link request", requestId);

        if (!string.Equals(invitation.InviteeEmail, user.Email, StringComparison.OrdinalIgnoreCase))
            throw new ForbiddenException();

        if (invitation.Status != MemberInviteStatus.Pending)
            throw new ConflictException("This link request is no longer pending.");

        invitation.Status = MemberInviteStatus.Declined;
        invitation.RespondedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        await notifications.CreateAsync(
            invitation.InvitedByUserId,
            "Link request declined",
            $"{user.DisplayName} declined your partner link request.",
            notificationType: "PartnerLinkDeclined",
            referenceId: invitation.Id.ToString(),
            ct);
    }

    public async Task CancelRequestAsync(Guid userId, Guid requestId, CancellationToken ct = default)
    {
        var invitation = await db.RelationshipInvitations.FindAsync([requestId], ct)
            ?? throw new NotFoundException("Link request", requestId);

        if (invitation.InvitedByUserId != userId)
            throw new ForbiddenException();

        if (invitation.Status != MemberInviteStatus.Pending)
            throw new ConflictException("This link request is no longer pending.");

        db.RelationshipInvitations.Remove(invitation);
        await db.SaveChangesAsync(ct);
    }

    public async Task UnlinkAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct)
            ?? throw new NotFoundException("User", userId);

        var partner = await relAccess.GetPartnerAsync(userId)
            ?? throw new ConflictException("You're not linked with a partner.");

        var relationship = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new ConflictException("You're not linked with a partner.");

        var membership = await db.RelationshipMembers
            .FirstOrDefaultAsync(m => m.RelationshipId == relationship.Id && m.UserId == userId, ct)
            ?? throw new ConflictException("You're not a member of this relationship.");

        // Remove the caller from the shared relationship and give them a fresh
        // solo relationship so their account still has a home. The shared
        // relationship and all its data stay with the partner who remains.
        // Runs in a single retriable transaction so we never leave the caller
        // with no relationship at all.
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);

            db.RelationshipMembers.Remove(membership);
            await db.SaveChangesAsync(ct);

            var solo = new Relationship { Status = RelationshipStatus.Active };
            db.Relationships.Add(solo);
            db.RelationshipMembers.Add(new RelationshipMember
            {
                RelationshipId = solo.Id,
                UserId = userId,
                Role = RelationshipRole.Admin,
                InviteStatus = MemberInviteStatus.Accepted
            });
            await db.SaveChangesAsync(ct);

            await tx.CommitAsync(ct);
        });

        logger.LogInformation("User {UserId} unlinked from relationship {RelationshipId}", userId, relationship.Id);

        await notifications.CreateAsync(
            partner.Id,
            "Partner unlinked",
            $"{user.DisplayName} unlinked their account from yours.",
            notificationType: "PartnerUnlinked",
            referenceId: relationship.Id.ToString(),
            ct);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private Task NotifyLinkRequestAsync(Guid recipientUserId, string requesterName, Guid invitationId, CancellationToken ct) =>
        notifications.CreateAsync(
            recipientUserId,
            "Partner link request",
            $"{requesterName} wants to link their account with yours.",
            notificationType: "PartnerLinkRequest",
            referenceId: invitationId.ToString(),
            ct);

    /// <summary>
    /// Moves all data owned by <paramref name="sourceRelationshipId"/> to
    /// <paramref name="targetRelationshipId"/>, re-points the source's members,
    /// then deletes the now-empty source relationship. Runs in a transaction so
    /// a partial merge can't leave data orphaned.
    /// </summary>
    private async Task MergeRelationshipsAsync(Guid sourceRelationshipId, Guid targetRelationshipId, CancellationToken ct)
    {
        // The DbContext is configured with EnableRetryOnFailure, so a user-initiated
        // transaction must run through the execution strategy — otherwise EF throws
        // "The configured execution strategy 'NpgsqlRetryingExecutionStrategy' does not
        // support user-initiated transactions." The whole merge runs as one retriable unit.
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);

            // Re-point every entity that references a relationship. Discovered from
            // the EF model so new relationship-scoped tables are covered automatically.
            //
            // RelationshipMember is handled separately below: a blanket UPDATE on it
            // would violate the unique (RelationshipId, UserId) index whenever the
            // target relationship already contains a member (the normal case when a
            // partner accepts a link request), producing an unhandled DB error.
            foreach (var entityType in db.Model.GetEntityTypes())
            {
                if (entityType.ClrType == typeof(Relationship) ||
                    entityType.ClrType == typeof(RelationshipMember))
                    continue;

                var fkProperty = entityType.FindProperty(nameof(RelationshipMember.RelationshipId));
                if (fkProperty is null)
                    continue;

                var table = entityType.GetTableName();
                var column = fkProperty.GetColumnName();
                if (string.IsNullOrEmpty(table) || string.IsNullOrEmpty(column))
                    continue;

                var sql = $"UPDATE \"{table}\" SET \"{column}\" = {{0}} WHERE \"{column}\" = {{1}}";
                await db.Database.ExecuteSqlRawAsync(sql, [targetRelationshipId, sourceRelationshipId], ct);
            }

            // Move the source relationship's members into the target, skipping any
            // user who is already a member of the target so the unique
            // (RelationshipId, UserId) index is never violated. Redundant source
            // rows are deleted; the rest are re-pointed to the target.
            var targetUserIds = await db.RelationshipMembers
                .Where(m => m.RelationshipId == targetRelationshipId)
                .Select(m => m.UserId)
                .ToListAsync(ct);

            var sourceMembers = await db.RelationshipMembers
                .Where(m => m.RelationshipId == sourceRelationshipId)
                .ToListAsync(ct);

            foreach (var member in sourceMembers)
            {
                if (targetUserIds.Contains(member.UserId))
                    db.RelationshipMembers.Remove(member);
                else
                    member.RelationshipId = targetRelationshipId;
            }

            await db.SaveChangesAsync(ct);

            // Any change tracker snapshots are now stale after the raw updates.
            db.ChangeTracker.Clear();

            // Delete the emptied source relationship.
            await db.Relationships
                .Where(r => r.Id == sourceRelationshipId)
                .ExecuteDeleteAsync(ct);

            await tx.CommitAsync(ct);
        });
    }

    private async Task<Relationship> CreateSoloRelationshipAsync(Guid userId, CancellationToken ct)
    {
        var relationship = new Relationship { Status = RelationshipStatus.Active };
        db.Relationships.Add(relationship);
        db.RelationshipMembers.Add(new RelationshipMember
        {
            RelationshipId = relationship.Id,
            UserId = userId,
            Role = RelationshipRole.Admin,
            InviteStatus = MemberInviteStatus.Accepted
        });
        await db.SaveChangesAsync(ct);
        return relationship;
    }

    private static string GenerateInviteCode()
    {
        // Short, human-shareable, collision-resistant enough for a 14-day window.
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Span<char> code = stackalloc char[8];
        var bytes = new byte[8];
        System.Security.Cryptography.RandomNumberGenerator.Fill(bytes);
        for (var i = 0; i < code.Length; i++)
            code[i] = alphabet[bytes[i] % alphabet.Length];
        return $"AMORI-{new string(code)}";
    }

    private static PartnerLinkRequestResponse ToResponse(
        RelationshipInvitation invite, PartnerLinkDirection direction, string? otherName, string otherEmail) => new()
    {
        Id = invite.Id,
        Direction = direction,
        OtherPartyName = otherName,
        OtherPartyEmail = otherEmail,
        CreatedAt = invite.CreatedAt,
        ExpiresAt = invite.ExpiresAt
    };
}
