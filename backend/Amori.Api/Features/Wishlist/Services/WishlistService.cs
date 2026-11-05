using Amori.Api.Common.Exceptions;
using static Amori.Api.Common.Text.UserInput;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Infrastructure.Relationships;
using Amori.Api.Infrastructure.Storage;
using Amori.Api.Features.Notifications;
using Amori.Api.Features.Notifications.Services;
using Microsoft.EntityFrameworkCore;
using Amori.Api.Features.Wishlist.DTOs;

namespace Amori.Api.Features.Wishlist.Services;

public sealed class WishlistService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess,
    IFileStorageService storage,
    INotificationService notifications) : IWishlistService
{
    private WishlistItemResponse Map(WishlistItem w) => new()
    {
        Id = w.Id, RelationshipId = w.RelationshipId,
        AddedByUserId = w.AddedByUserId, AddedByName = w.AddedBy?.DisplayName ?? string.Empty,
        Name = w.Name, Description = w.Description, ImageKey = w.ImageKey,
        ImageUrl = string.IsNullOrWhiteSpace(w.ImageKey) ? null : storage.GetPublicUrl(w.ImageKey),
        Price = w.Price, Url = w.Url, Priority = w.Priority, Notes = w.Notes,
        IsPurchased = w.IsPurchased, IsFavorite = w.IsFavorite,
        PurchasedAt = w.PurchasedAt, CreatedAt = w.CreatedAt, UpdatedAt = w.UpdatedAt
    };


    private async Task<(Guid relId, WishlistItem item)> LoadAsync(Guid userId, Guid itemId, CancellationToken ct)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        var item = await db.WishlistItems.Include(w => w.AddedBy)
            .FirstOrDefaultAsync(w => w.Id == itemId, ct)
            ?? throw new NotFoundException("Wishlist item", itemId);
        if (item.RelationshipId != rel.Id) throw new ForbiddenException();
        return (rel.Id, item);
    }

    public async Task<IReadOnlyList<WishlistItemResponse>> GetAllAsync(Guid userId, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        var items = await db.WishlistItems.Include(w => w.AddedBy)
            .Where(w => w.RelationshipId == rel.Id)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync(ct);
        return items.Select(Map).ToList();
    }

    public async Task<WishlistItemResponse> GetByIdAsync(Guid userId, Guid itemId, CancellationToken ct = default)
    {
        var (_, item) = await LoadAsync(userId, itemId, ct);
        return Map(item);
    }

    public async Task<WishlistItemResponse> CreateAsync(Guid userId, CreateWishlistItemRequest request, CancellationToken ct = default)
    {
        var rel = await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");
        if (string.IsNullOrWhiteSpace(request.Name)) throw new ValidationException("Name is required.");

        var item = new WishlistItem
        {
            RelationshipId = rel.Id, AddedByUserId = userId,
            Name = request.Name.Trim(), Description = NullIfBlank(request.Description),
            ImageKey = NullIfBlank(request.ImageKey), Price = ValidMoney(request.Price, "Price"), Url = NormalizeLink(request.Url),
            Priority = request.Priority, Notes = request.Notes
        };
        db.WishlistItems.Add(item);
        await db.SaveChangesAsync(ct);
        item.AddedBy = (await db.Users.FindAsync([userId], ct))!;

        // Notify the partner that a new item was added
        await NotifyPartnerAsync(userId, item, ct);

        return Map(item);
    }

    /// <summary>
    /// Notify the partner that a new wishlist item was added to the shared wishlist.
    /// Best-effort; does not throw if notification dispatch fails.
    /// </summary>
    private async Task NotifyPartnerAsync(Guid creatorId, WishlistItem item, CancellationToken ct = default)
    {
        try
        {
            // Find the partner (the other member of the relationship)
            var partner = await db.RelationshipMembers
                .Where(rm => rm.RelationshipId == item.RelationshipId && rm.UserId != creatorId)
                .Select(rm => rm.User)
                .FirstOrDefaultAsync(ct);

            if (partner == null)
                return; // No partner yet

            var creatorName = item.AddedBy?.DisplayName ?? "Your partner";
            var body = $"{creatorName} added to the wishlist: {item.Name}";

            await notifications.CreateAsync(
                partner.Id,
                "New wishlist item 🎁",
                body,
                notificationType: NotificationTypes.WishlistItemAdded,
                referenceId: item.Id.ToString(),
                ct: ct);
        }
        catch (Exception ex)
        {
            // Log but don't throw — notification failures shouldn't break item creation
            System.Diagnostics.Debug.WriteLine($"Wishlist notification failed: {ex.Message}");
        }
    }

    public async Task<WishlistItemResponse> UpdateAsync(Guid userId, Guid itemId, UpdateWishlistItemRequest request, CancellationToken ct = default)
    {
        var (_, item) = await LoadAsync(userId, itemId, ct);

        // Content edits are owner-only, but purchased/favorite are shared toggles
        // either partner may flip (mirrors the /complete and /favorite endpoints).
        var editsContent = request.Name != null || request.Description != null ||
            request.ImageKey != null || request.Price.HasValue || request.ClearPrice == true ||
            request.Url != null || request.Priority.HasValue || request.Notes != null;
        if (editsContent && item.AddedByUserId != userId)
            throw new ForbiddenException("Only the owner can update this item.");

        if (request.Name != null && string.IsNullOrWhiteSpace(request.Name))
            throw new ValidationException("Name is required.");

        if (request.Name != null) item.Name = request.Name.Trim();
        if (request.Description != null) item.Description = NullIfBlank(request.Description);
        if (request.ImageKey != null) item.ImageKey = NullIfBlank(request.ImageKey);
        if (request.Price.HasValue) item.Price = ValidMoney(request.Price, "Price");
        else if (request.ClearPrice == true) item.Price = null;
        if (request.Url != null) item.Url = NormalizeLink(request.Url);
        if (request.Priority.HasValue) item.Priority = request.Priority.Value;
        if (request.Notes != null) item.Notes = request.Notes;
        if (request.IsFavorite.HasValue) item.IsFavorite = request.IsFavorite.Value;
        if (request.IsPurchased.HasValue)
        {
            item.IsPurchased = request.IsPurchased.Value;
            item.PurchasedAt = request.IsPurchased.Value ? (item.PurchasedAt ?? DateTime.UtcNow) : null;
        }
        await db.SaveChangesAsync(ct);
        return Map(item);
    }

    public async Task DeleteAsync(Guid userId, Guid itemId, CancellationToken ct = default)
    {
        var (_, item) = await LoadAsync(userId, itemId, ct);
        if (item.AddedByUserId != userId) throw new ForbiddenException("Only the owner can delete this item.");
        db.WishlistItems.Remove(item);
        await db.SaveChangesAsync(ct);
    }

    public async Task<WishlistItemResponse> CompleteAsync(Guid userId, Guid itemId, CancellationToken ct = default)
    {
        var (_, item) = await LoadAsync(userId, itemId, ct);
        item.IsPurchased = true;
        item.PurchasedAt ??= DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Map(item);
    }

    public async Task<WishlistItemResponse> FavoriteAsync(Guid userId, Guid itemId, CancellationToken ct = default)
    {
        var (_, item) = await LoadAsync(userId, itemId, ct);
        item.IsFavorite = true;
        await db.SaveChangesAsync(ct);
        return Map(item);
    }
}
