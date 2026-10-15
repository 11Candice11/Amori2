using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Domain.Enums;
using Amori.Api.Infrastructure.Relationships;
using Amori.Api.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Amori.Api.Features.Vault.DTOs;
using Amori.Api.Features.Memories.DTOs;
using Amori.Api.Features.Notifications;
using Amori.Api.Features.Notifications.Services;
using Amori.Api.Features.Users.Services;

namespace Amori.Api.Features.Vault.Services;

public sealed class VaultService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess,
    IFileStorageService storage,
    INotificationService notifications,
    IRewardService rewards) : IVaultService
{
    /// <summary>The number of collectible card designs the client ships.</summary>
    private const int CardCount = 10;

    private VaultGiftResponse Map(VaultGift g)
    {
        var isMemory = g.MemoryId.HasValue;
        
        return new()
        {
            Id = g.Id,
            UserId = g.UserId,
            MemoryId = g.MemoryId,
            VisionBoardItemId = g.VisionBoardItemId,
            Title = isMemory ? (g.Memory?.Title ?? string.Empty) : (g.VisionBoardItem?.Title ?? string.Empty),
            Description = isMemory ? g.Memory?.Description : g.VisionBoardItem?.Description,
            MemoryDateTime = isMemory ? g.Memory?.MemoryDateTime : g.VisionBoardItem?.TargetDate,
            Location = isMemory ? g.Memory?.Location : g.VisionBoardItem?.LocationName,
            Latitude = isMemory ? g.Memory?.Latitude : g.VisionBoardItem?.Latitude,
            Longitude = isMemory ? g.Memory?.Longitude : g.VisionBoardItem?.Longitude,
            CreatedByName = isMemory 
                ? (g.Memory?.CreatedBy?.DisplayName ?? string.Empty)
                : (g.VisionBoardItem?.CreatedBy?.DisplayName ?? string.Empty),
            CardNumber = g.CardNumber,
            // CreatedAt *is* the moment it was saved — see VaultGift's remarks.
            SavedAt = g.CreatedAt,
            Media = isMemory
                ? (g.Memory?.Media ?? new List<MemoryMedia>())
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
                : []
        };
    }

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
            .Include(g => g.Memory).ThenInclude(m => m!.CreatedBy)
            .Include(g => g.Memory).ThenInclude(m => m!.Media)
            .Include(g => g.VisionBoardItem).ThenInclude(v => v!.CreatedBy)
            .FirstOrDefaultAsync(g => g.Id == giftId && g.UserId == userId, ct)
            ?? throw new NotFoundException("Saved gift", giftId);

    public async Task<IReadOnlyList<VaultGiftResponse>> GetGiftsAsync(Guid userId, CancellationToken ct = default)
    {
        // A memory or vision the couple has since deleted shouldn't linger as a tombstone
        // in the vault, so deleted items drop out of the listing.
        var gifts = await db.VaultGifts
            .AsNoTracking()
            .Include(g => g.Memory).ThenInclude(m => m!.CreatedBy)
            .Include(g => g.Memory).ThenInclude(m => m!.Media)
            .Include(g => g.VisionBoardItem).ThenInclude(v => v!.CreatedBy)
            .Where(g => g.UserId == userId && 
                        (g.Memory == null || !g.Memory.IsDeleted) &&
                        (g.VisionBoardItem == null || !g.VisionBoardItem.IsDeleted))
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
        // Validate that exactly one ID is provided
        var hasMemory = request.MemoryId.HasValue && request.MemoryId.Value != Guid.Empty;
        var hasVision = request.VisionBoardItemId.HasValue && request.VisionBoardItemId.Value != Guid.Empty;
        
        if (!hasMemory && !hasVision)
            throw new ValidationException("Either MemoryId or VisionBoardItemId is required.");
        if (hasMemory && hasVision)
            throw new ValidationException("Provide either MemoryId or VisionBoardItemId, not both.");
            
        if (request.CardNumber is < 1 or > CardCount)
            throw new ValidationException($"CardNumber must be between 1 and {CardCount}.");

        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

        if (hasMemory)
        {
            var memory = await db.Memories
                .Include(m => m.CreatedBy)
                .Include(m => m.Media)
                .FirstOrDefaultAsync(m => m.Id == request.MemoryId && !m.IsDeleted, ct)
                ?? throw new NotFoundException("Memory", request.MemoryId!.Value);

            // You may only keep a memory from your own relationship.
            if (memory.RelationshipId != rel.Id) throw new ForbiddenException();

            // Saving twice is a no-op rather than an error.
            var existing = await db.VaultGifts
                .Include(g => g.Memory).ThenInclude(m => m!.CreatedBy)
                .Include(g => g.Memory).ThenInclude(m => m!.Media)
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
        else
        {
            var vision = await db.VisionBoardItems
                .Include(v => v.CreatedBy)
                .FirstOrDefaultAsync(v => v.Id == request.VisionBoardItemId && !v.IsDeleted, ct)
                ?? throw new NotFoundException("Vision board item", request.VisionBoardItemId!.Value);

            // You may only keep a vision from your own relationship.
            if (vision.RelationshipId != rel.Id) throw new ForbiddenException();

            // Saving twice is a no-op rather than an error.
            var existing = await db.VaultGifts
                .Include(g => g.VisionBoardItem).ThenInclude(v => v!.CreatedBy)
                .FirstOrDefaultAsync(g => g.UserId == userId && g.VisionBoardItemId == vision.Id, ct);
            if (existing != null) return Map(existing);

            var gift = new VaultGift
            {
                UserId = userId,
                VisionBoardItemId = vision.Id,
                CardNumber = request.CardNumber
            };
            db.VaultGifts.Add(gift);
            await db.SaveChangesAsync(ct);

            gift.VisionBoardItem = vision;
            return Map(gift);
        }
    }

    public async Task<SendGiftResult> SendGiftToPartnerAsync(Guid userId, SaveVaultGiftRequest request, CancellationToken ct = default)
    {
        // Validate that exactly one ID is provided
        var hasMemory = request.MemoryId.HasValue && request.MemoryId.Value != Guid.Empty;
        var hasVision = request.VisionBoardItemId.HasValue && request.VisionBoardItemId.Value != Guid.Empty;
        
        if (!hasMemory && !hasVision)
            throw new ValidationException("Either MemoryId or VisionBoardItemId is required.");
        if (hasMemory && hasVision)
            throw new ValidationException("Provide either MemoryId or VisionBoardItemId, not both.");
            
        if (request.CardNumber is < 1 or > CardCount)
            throw new ValidationException($"CardNumber must be between 1 and {CardCount}.");

        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        var partner = await relAccess.GetPartnerAsync(userId)
            ?? throw new ConflictException("Your relationship does not have a second partner yet.");

        string title;
        Guid referenceId;
        VaultGift? gift = null;

        if (hasMemory)
        {
            var memory = await db.Memories
                .Include(m => m.CreatedBy)
                .FirstOrDefaultAsync(m => m.Id == request.MemoryId && !m.IsDeleted, ct)
                ?? throw new NotFoundException("Memory", request.MemoryId!.Value);

            if (memory.RelationshipId != rel.Id) throw new ForbiddenException();

            // Idempotent: sending the same memory twice doesn't create a duplicate.
            var existing = await db.VaultGifts
                .FirstOrDefaultAsync(g => g.UserId == partner.Id && g.MemoryId == memory.Id, ct);

            if (existing == null)
            {
                gift = new VaultGift
                {
                    UserId = partner.Id,
                    MemoryId = memory.Id,
                    CardNumber = request.CardNumber
                };
                db.VaultGifts.Add(gift);
                await db.SaveChangesAsync(ct);
            }
            else
            {
                gift = existing;
            }

            title = memory.Title;
            referenceId = memory.Id;
        }
        else
        {
            var vision = await db.VisionBoardItems
                .Include(v => v.CreatedBy)
                .FirstOrDefaultAsync(v => v.Id == request.VisionBoardItemId && !v.IsDeleted, ct)
                ?? throw new NotFoundException("Vision board item", request.VisionBoardItemId!.Value);

            if (vision.RelationshipId != rel.Id) throw new ForbiddenException();

            // Idempotent: sending the same vision twice doesn't create a duplicate.
            var existing = await db.VaultGifts
                .FirstOrDefaultAsync(g => g.UserId == partner.Id && g.VisionBoardItemId == vision.Id, ct);

            if (existing == null)
            {
                gift = new VaultGift
                {
                    UserId = partner.Id,
                    VisionBoardItemId = vision.Id,
                    CardNumber = request.CardNumber
                };
                db.VaultGifts.Add(gift);
                await db.SaveChangesAsync(ct);
            }
            else
            {
                gift = existing;
            }

            title = vision.Title;
            referenceId = vision.Id;
        }

        // Notify the partner (in-app bell + best-effort push).
        var sender = await db.Users.FindAsync([userId], ct);
        var senderName = sender?.DisplayName ?? "Your partner";
        await notifications.CreateAsync(
            partner.Id,
            "You received a gift 🎁",
            $"{senderName} sent you \u201C{title}\u201D for your vault.",
            notificationType: NotificationTypes.Gift,
            referenceId: referenceId.ToString(),
            ct);

        return new SendGiftResult
        {
            MemoryId = hasMemory ? request.MemoryId!.Value : Guid.Empty,
            GiftId = gift!.Id,
            RecipientName = partner.DisplayName,
            Rewards = await rewards.GrantAsync(
                userId, RewardRequest.For(ActivityType.CardCollected, gift.Id), ct),
        };
    }

    public async Task<SendGiftResult> CreateGiftToPartnerAsync(Guid userId, CreateGiftRequest request, CancellationToken ct = default)
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("Title is required.");
        if (request.CardNumber is < 1 or > CardCount)
            throw new ValidationException($"CardNumber must be between 1 and {CardCount}.");

        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        var partner = await relAccess.GetPartnerAsync(userId)
            ?? throw new ConflictException("Your relationship does not have a second partner yet.");

        // Create a new memory for the gift
        var memory = new Memory
        {
            RelationshipId = rel.Id,
            CreatedByUserId = userId,
            Title = request.Title.Trim(),
            Description = request.Description,
            Category = (MemoryCategory)request.Category,
            MemoryDateTime = request.MemoryDateTime.ToUniversalTime(),
            Location = request.Location,
            Latitude = request.Latitude.HasValue ? (double?)request.Latitude.Value : null,
            Longitude = request.Longitude.HasValue ? (double?)request.Longitude.Value : null,
            // Gift-only memories are marked so they don't appear in the feed — only in vaults
            IsGiftOnly = true
        };
        db.Memories.Add(memory);
        await db.SaveChangesAsync(ct);

        // Add media if provided
        if (request.Media.Count > 0)
        {
            foreach (var mediaReq in request.Media)
            {
                var media = new MemoryMedia
                {
                    MemoryId = memory.Id,
                    FileKey = mediaReq.FileKey,
                    MediaType = (MemoryMediaType)mediaReq.MediaType,
                    DurationSeconds = mediaReq.DurationSeconds,
                    Title = string.IsNullOrWhiteSpace(mediaReq.Title) ? null : mediaReq.Title.Trim(),
                    ThumbnailUrl = string.IsNullOrWhiteSpace(mediaReq.ThumbnailUrl) ? null : mediaReq.ThumbnailUrl.Trim()
                };
                db.MemoryMedia.Add(media);
            }
            await db.SaveChangesAsync(ct);
        }

        // Create a gift entry in the partner's vault
        var gift = new VaultGift
        {
            UserId = partner.Id,
            MemoryId = memory.Id,
            CardNumber = request.CardNumber
        };
        db.VaultGifts.Add(gift);
        await db.SaveChangesAsync(ct);

        // Notify the partner
        var sender = await db.Users.FindAsync([userId], ct);
        var senderName = sender?.DisplayName ?? "Your partner";
        await notifications.CreateAsync(
            partner.Id,
            "You received a gift 🎁",
            $"{senderName} sent you \u201C{request.Title}\u201D for your vault.",
            notificationType: NotificationTypes.Gift,
            referenceId: memory.Id.ToString(),
            ct);

        return new SendGiftResult
        {
            MemoryId = memory.Id,
            GiftId = gift.Id,
            RecipientName = partner.DisplayName,
            Rewards = await rewards.GrantAsync(
                userId, RewardRequest.For(ActivityType.CardCollected, gift.Id), ct),
        };
    }

    public async Task RemoveGiftAsync(Guid userId, Guid giftId, CancellationToken ct = default)
    {
        var gift = await LoadOwnAsync(userId, giftId, ct);
        db.VaultGifts.Remove(gift);
        await db.SaveChangesAsync(ct);
    }
}
