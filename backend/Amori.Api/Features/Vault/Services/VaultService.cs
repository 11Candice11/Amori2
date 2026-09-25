using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Infrastructure.Relationships;
using Amori.Api.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Amori.Api.Features.Vault.DTOs;
using Amori.Api.Features.Memories.DTOs;
using Amori.Api.Features.Notifications;
using Amori.Api.Features.Notifications.Services;

namespace Amori.Api.Features.Vault.Services;

public sealed class VaultService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess,
    IFileStorageService storage,
    INotificationService notifications) : IVaultService
{
    /// <summary>The number of collectible card designs the client ships.</summary>
    private const int CardCount = 10;

    private VaultGiftResponse Map(VaultGift g) => new()
    {
        Id = g.Id, UserId = g.UserId, MemoryId = g.MemoryId,
        Title = g.Memory?.Title ?? string.Empty,
        Description = g.Memory?.Description,
        MemoryDateTime = g.Memory?.MemoryDateTime ?? default,
        Location = g.Memory?.Location,
        Latitude = g.Memory?.Latitude,
        Longitude = g.Memory?.Longitude,
        CreatedByName = g.Memory?.CreatedBy?.DisplayName ?? string.Empty,
        CardNumber = g.CardNumber,
        // CreatedAt *is* the moment it was saved — see VaultGift's remarks.
        SavedAt = g.CreatedAt,
        Media = (g.Memory?.Media ?? new List<MemoryMedia>())
            .OrderBy(mm => mm.CreatedAt)
            .Select(mm => new MemoryMediaResponse
            {
                Id = mm.Id, FileKey = mm.FileKey,
                Url = storage.GetPublicUrl(mm.FileKey),
                MediaType = mm.MediaType,
                DurationSeconds = mm.DurationSeconds,
                Title = mm.Title,
                ThumbnailUrl = mm.ThumbnailUrl,
                CreatedAt = mm.CreatedAt
            }).ToList()
    };

    /// <summary>
    /// Loads one of the caller's own gifts.
    ///
    /// Note this scopes the lookup by UserId rather than loading the row and
    /// then comparing owners (the pattern most other services use). A vault is
    /// private, so a gift belonging to the partner should be indistinguishable
    /// from one that doesn't exist — a 401 here would confirm the id is real.
    /// </summary>
    private async Task<VaultGift> LoadOwnAsync(Guid userId, Guid giftId, CancellationToken ct) =>
        await db.VaultGifts
            .Include(g => g.Memory).ThenInclude(m => m.CreatedBy)
            .Include(g => g.Memory).ThenInclude(m => m.Media)
            .FirstOrDefaultAsync(g => g.Id == giftId && g.UserId == userId, ct)
            ?? throw new NotFoundException("Saved gift", giftId);

    public async Task<IReadOnlyList<VaultGiftResponse>> GetGiftsAsync(Guid userId, CancellationToken ct = default)
    {
        // A memory the couple has since deleted shouldn't linger as a tombstone
        // in the vault, so deleted memories drop out of the listing.
        var gifts = await db.VaultGifts
            .AsNoTracking()
            .Include(g => g.Memory).ThenInclude(m => m.CreatedBy)
            .Include(g => g.Memory).ThenInclude(m => m.Media)
            .Where(g => g.UserId == userId && !g.Memory.IsDeleted)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync(ct);

        return gifts.Select(Map).ToList();
    }

    public async Task<VaultGiftResponse> GetGiftByIdAsync(Guid userId, Guid giftId, CancellationToken ct = default)
    {
        var gift = await LoadOwnAsync(userId, giftId, ct);
        return Map(gift);
    }

    public async Task<VaultGiftResponse> SaveGiftAsync(Guid userId, SaveVaultGiftRequest request, CancellationToken ct = default)
    {
        if (request.MemoryId == Guid.Empty) throw new ValidationException("MemoryId is required.");
        if (request.CardNumber is < 1 or > CardCount)
            throw new ValidationException($"CardNumber must be between 1 and {CardCount}.");

        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        var memory = await db.Memories
            .Include(m => m.CreatedBy)
            .Include(m => m.Media)
            .FirstOrDefaultAsync(m => m.Id == request.MemoryId && !m.IsDeleted, ct)
            ?? throw new NotFoundException("Memory", request.MemoryId);

        // You may only keep a memory from your own relationship. Without this a
        // caller could save any memory in the database by guessing its id.
        if (memory.RelationshipId != rel.Id) throw new UnauthorizedException();

        // Saving twice is a no-op rather than an error: the client saves from a
        // "Save to Vault" button that can be tapped again on a stale screen.
        var existing = await db.VaultGifts
            .Include(g => g.Memory).ThenInclude(m => m.CreatedBy)
            .Include(g => g.Memory).ThenInclude(m => m.Media)
            .FirstOrDefaultAsync(g => g.UserId == userId && g.MemoryId == memory.Id, ct);
        if (existing != null) return Map(existing);

        var gift = new VaultGift
        {
            UserId = userId,
            MemoryId = memory.Id,
            CardNumber = request.CardNumber
        };
        db.VaultGifts.Add(gift);
        await db.SaveChangesAsync(ct);

        gift.Memory = memory;
        return Map(gift);
    }

    public async Task<SendGiftResult> SendGiftToPartnerAsync(Guid userId, SaveVaultGiftRequest request, CancellationToken ct = default)
    {
        if (request.MemoryId == Guid.Empty) throw new ValidationException("MemoryId is required.");
        if (request.CardNumber is < 1 or > CardCount)
            throw new ValidationException($"CardNumber must be between 1 and {CardCount}.");

        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        var partner = await relAccess.GetPartnerAsync(userId)
            ?? throw new ConflictException("Your relationship does not have a second partner yet.");

        var memory = await db.Memories
            .Include(m => m.CreatedBy)
            .FirstOrDefaultAsync(m => m.Id == request.MemoryId && !m.IsDeleted, ct)
            ?? throw new NotFoundException("Memory", request.MemoryId);

        // Same guard as SaveGiftAsync: you may only send a memory from your own
        // relationship, so a caller can't gift an arbitrary memory by id.
        if (memory.RelationshipId != rel.Id) throw new UnauthorizedException();

        // Idempotent per recipient: sending the same memory twice doesn't create
        // a duplicate in the partner's vault. Keyed on (partner.Id, memoryId).
        var existing = await db.VaultGifts
            .FirstOrDefaultAsync(g => g.UserId == partner.Id && g.MemoryId == memory.Id, ct);

        if (existing == null)
        {
            var gift = new VaultGift
            {
                // The gift is owned by the PARTNER — that's what lands it in
                // their vault rather than the sender's.
                UserId = partner.Id,
                MemoryId = memory.Id,
                CardNumber = request.CardNumber
            };
            db.VaultGifts.Add(gift);
            await db.SaveChangesAsync(ct);
        }

        // Notify the partner (in-app bell + best-effort push). CreateAsync never
        // throws, so a notification failure won't fail the gift delivery.
        var sender = await db.Users.FindAsync([userId], ct);
        var senderName = sender?.DisplayName ?? "Your partner";
        await notifications.CreateAsync(
            partner.Id,
            "You received a gift 🎁",
            $"{senderName} sent you \u201C{memory.Title}\u201D for your vault.",
            notificationType: NotificationTypes.Gift,
            referenceId: memory.Id.ToString(),
            ct);

        return new SendGiftResult
        {
            MemoryId = memory.Id,
            RecipientName = partner.DisplayName,
        };
    }

    public async Task RemoveGiftAsync(Guid userId, Guid giftId, CancellationToken ct = default)
    {
        var gift = await LoadOwnAsync(userId, giftId, ct);
        db.VaultGifts.Remove(gift);
        await db.SaveChangesAsync(ct);
    }
}
