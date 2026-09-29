using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Domain.Enums;
using Amori.Api.Features.Notifications;
using Amori.Api.Features.Notifications.Services;
using Amori.Api.Features.VisionBoard.DTOs;
using Amori.Api.Infrastructure.Relationships;
using Amori.Api.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace Amori.Api.Features.VisionBoard.Services;

/// <summary>
/// The couple's shared "Us" Vision Board. Items and sections belong to the whole
/// relationship — both partners can read and modify them. A relationship gets a
/// set of default sections the first time it opens the board.
/// </summary>
public sealed class VisionBoardService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess,
    IFileStorageService storage,
    INotificationService notifications) : IVisionBoardService
{
    /// <summary>
    /// The default shelves seeded for a new relationship, in display order,
    /// paired with the item type they collect (used to auto-place items created
    /// without an explicit section).
    /// </summary>
    private static readonly (string Name, string Description, VisionBoardItemType Type)[] DefaultSections =
    [
        ("Our Dreams", "Aspirations and inner callings.", VisionBoardItemType.Dream),
        ("Our Places", "Corners of the earth to roam.", VisionBoardItemType.Place),
        ("Our Home", "Sanctuary aesthetics and hearth.", VisionBoardItemType.Home),
        ("Our Experiences", "Things to feel and do together.", VisionBoardItemType.Experience),
        ("Our Future", "Long horizons and legacies.", VisionBoardItemType.Future),
        ("Our Little Things", "Daily joys and cozy whimsies.", VisionBoardItemType.LittleThing),
    ];

    // ── Mapping ──────────────────────────────────────────────────────────────

    private VisionBoardItemResponse MapItem(VisionBoardItem i) => new()
    {
        Id = i.Id,
        RelationshipId = i.RelationshipId,
        CreatedByUserId = i.CreatedByUserId,
        CreatedByName = i.CreatedBy?.DisplayName ?? string.Empty,
        SectionId = i.SectionId,
        Title = i.Title,
        Description = i.Description,
        Type = i.Type,
        ImageFileKey = i.ImageFileKey,
        ImageUrl = string.IsNullOrWhiteSpace(i.ImageFileKey) ? null : storage.GetPublicUrl(i.ImageFileKey),
        LocationName = i.LocationName,
        Latitude = i.Latitude,
        Longitude = i.Longitude,
        TargetDate = i.TargetDate,
        Budget = i.Budget,
        ExternalReference = i.ExternalReference,
        Notes = i.Notes,
        IsPinned = i.IsPinned,
        IsCompleted = i.IsCompleted,
        CompletedAt = i.CompletedAt,
        CompletedNote = i.CompletedNote,
        SortOrder = i.SortOrder,
        CreatedAt = i.CreatedAt,
        UpdatedAt = i.UpdatedAt,
    };

    private VisionBoardSectionResponse MapSection(VisionBoardSection s, int itemCount) => new()
    {
        Id = s.Id,
        RelationshipId = s.RelationshipId,
        Name = s.Name,
        Description = s.Description,
        CoverImageFileKey = s.CoverImageFileKey,
        CoverImageUrl = string.IsNullOrWhiteSpace(s.CoverImageFileKey) ? null : storage.GetPublicUrl(s.CoverImageFileKey),
        SortOrder = s.SortOrder,
        IsDefault = s.IsDefault,
        ItemCount = itemCount,
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt,
    };

    // ── Relationship + seeding ─────────────────────────────────────────────────

    private async Task<Relationship> RequireRelationshipAsync(Guid userId)
        => await relAccess.GetUserRelationshipAsync(userId)
            ?? throw new NotFoundException("You are not a member of any relationship.");

    /// <summary>
    /// Returns the relationship's sections, seeding the defaults the first time
    /// the board is opened. Only ever seeds when the relationship has no sections
    /// at all, so a couple who deleted defaults doesn't get them back.
    /// </summary>
    private async Task<List<VisionBoardSection>> EnsureSectionsAsync(Guid relationshipId, CancellationToken ct)
    {
        var sections = await db.VisionBoardSections
            .Where(s => s.RelationshipId == relationshipId && !s.IsDeleted)
            .OrderBy(s => s.SortOrder).ThenBy(s => s.CreatedAt)
            .ToListAsync(ct);

        if (sections.Count > 0) return sections;

        var anyEver = await db.VisionBoardSections
            .AnyAsync(s => s.RelationshipId == relationshipId, ct);
        if (anyEver) return sections; // all deleted — respect that, don't re-seed

        var order = 0;
        var seeded = DefaultSections.Select(d => new VisionBoardSection
        {
            RelationshipId = relationshipId,
            Name = d.Name,
            Description = d.Description,
            SortOrder = order++,
            IsDefault = true,
        }).ToList();

        db.VisionBoardSections.AddRange(seeded);
        await db.SaveChangesAsync(ct);
        return seeded;
    }

    /// <summary>
    /// Picks the section a new item should land in when the client didn't choose
    /// one: the default section matching the item's type, else the first section.
    /// </summary>
    private static VisionBoardSection ResolveDefaultSection(
        List<VisionBoardSection> sections, VisionBoardItemType type)
    {
        var match = DefaultSections.FirstOrDefault(d => d.Type == type);
        if (match.Name is not null)
        {
            var byName = sections.FirstOrDefault(s =>
                s.IsDefault && string.Equals(s.Name, match.Name, StringComparison.OrdinalIgnoreCase));
            if (byName is not null) return byName;
        }
        return sections[0];
    }

    // ── Load helpers (with tenancy enforcement) ────────────────────────────────

    private async Task<(Relationship rel, VisionBoardItem item)> LoadItemAsync(Guid userId, Guid itemId, CancellationToken ct)
    {
        var rel = await RequireRelationshipAsync(userId);
        var item = await db.VisionBoardItems
            .Include(i => i.CreatedBy)
            .FirstOrDefaultAsync(i => i.Id == itemId && !i.IsDeleted, ct)
            ?? throw new NotFoundException("Vision board item", itemId);
        if (item.RelationshipId != rel.Id) throw new UnauthorizedException();
        return (rel, item);
    }

    private async Task<(Relationship rel, VisionBoardSection section)> LoadSectionAsync(Guid userId, Guid sectionId, CancellationToken ct)
    {
        var rel = await RequireRelationshipAsync(userId);
        var section = await db.VisionBoardSections
            .FirstOrDefaultAsync(s => s.Id == sectionId && !s.IsDeleted, ct)
            ?? throw new NotFoundException("Vision board section", sectionId);
        if (section.RelationshipId != rel.Id) throw new UnauthorizedException();
        return (rel, section);
    }

    // ── Board ──────────────────────────────────────────────────────────────────

    public async Task<VisionBoardResponse> GetBoardAsync(Guid userId, CancellationToken ct = default)
    {
        var rel = await RequireRelationshipAsync(userId);
        var sections = await EnsureSectionsAsync(rel.Id, ct);

        var items = await db.VisionBoardItems
            .Include(i => i.CreatedBy)
            .Where(i => i.RelationshipId == rel.Id && !i.IsDeleted)
            .ToListAsync(ct);

        // Default active-board ordering: pinned first, then sort order, then
        // newest. Completed items are returned too (flagged) so the client can
        // separate them into the "Achieved" area.
        var ordered = items
            .OrderByDescending(i => i.IsPinned)
            .ThenBy(i => i.SortOrder)
            .ThenByDescending(i => i.CreatedAt)
            .Select(MapItem)
            .ToList();

        var activeCountBySection = items
            .Where(i => !i.IsCompleted)
            .GroupBy(i => i.SectionId)
            .ToDictionary(g => g.Key, g => g.Count());

        var sectionResponses = sections
            .Select(s => MapSection(s, activeCountBySection.GetValueOrDefault(s.Id, 0)))
            .ToList();

        return new VisionBoardResponse { Sections = sectionResponses, Items = ordered };
    }

    // ── Items ────────────────────────────────────────────────────────────────

    public async Task<VisionBoardItemResponse> GetItemAsync(Guid userId, Guid itemId, CancellationToken ct = default)
    {
        var (_, item) = await LoadItemAsync(userId, itemId, ct);
        return MapItem(item);
    }

    public async Task<VisionBoardItemResponse> CreateItemAsync(Guid userId, CreateVisionBoardItemRequest request, CancellationToken ct = default)
    {
        var rel = await RequireRelationshipAsync(userId);
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("Title is required.");

        var sections = await EnsureSectionsAsync(rel.Id, ct);

        VisionBoardSection section;
        if (request.SectionId.HasValue)
        {
            section = sections.FirstOrDefault(s => s.Id == request.SectionId.Value)
                ?? throw new NotFoundException("Vision board section", request.SectionId.Value);
        }
        else
        {
            section = ResolveDefaultSection(sections, request.Type);
        }

        // New items sort to the end of their section (after existing ones).
        var maxSort = await db.VisionBoardItems
            .Where(i => i.SectionId == section.Id && !i.IsDeleted)
            .Select(i => (int?)i.SortOrder)
            .MaxAsync(ct) ?? -1;

        var item = new VisionBoardItem
        {
            RelationshipId = rel.Id,
            CreatedByUserId = userId,
            SectionId = section.Id,
            Title = request.Title.Trim(),
            Description = request.Description,
            Type = request.Type,
            ImageFileKey = string.IsNullOrWhiteSpace(request.ImageFileKey) ? null : request.ImageFileKey.Trim(),
            LocationName = request.LocationName,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            TargetDate = request.TargetDate?.ToUniversalTime(),
            Budget = request.Budget,
            ExternalReference = request.ExternalReference,
            Notes = request.Notes,
            IsPinned = request.IsPinned,
            SortOrder = maxSort + 1,
        };

        db.VisionBoardItems.Add(item);
        await db.SaveChangesAsync(ct);
        item.CreatedBy = (await db.Users.FindAsync([userId], ct))!;

        await NotifyPartnerAsync(
            userId,
            NotificationTypes.VisionBoardItemAdded,
            "A new dream on your Vision Board \u2728",
            $"{item.CreatedBy.DisplayName} added something to your shared vision.",
            item.Id,
            ct);

        return MapItem(item);
    }

    public async Task<VisionBoardItemResponse> UpdateItemAsync(Guid userId, Guid itemId, UpdateVisionBoardItemRequest request, CancellationToken ct = default)
    {
        // Both partners can edit shared items — no creator-only gate here.
        var (_, item) = await LoadItemAsync(userId, itemId, ct);

        if (request.Title != null)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new ValidationException("Title cannot be empty.");
            item.Title = request.Title.Trim();
        }
        if (request.Description != null) item.Description = request.Description;
        if (request.Type.HasValue) item.Type = request.Type.Value;
        if (request.ImageFileKey != null)
            item.ImageFileKey = string.IsNullOrWhiteSpace(request.ImageFileKey) ? null : request.ImageFileKey.Trim();
        if (request.LocationName != null) item.LocationName = request.LocationName;
        if (request.Latitude.HasValue) item.Latitude = request.Latitude;
        if (request.Longitude.HasValue) item.Longitude = request.Longitude;
        if (request.TargetDate.HasValue) item.TargetDate = request.TargetDate.Value.ToUniversalTime();
        if (request.Budget.HasValue) item.Budget = request.Budget;
        if (request.ExternalReference != null) item.ExternalReference = request.ExternalReference;
        if (request.Notes != null) item.Notes = request.Notes;
        if (request.IsPinned.HasValue) item.IsPinned = request.IsPinned.Value;

        await db.SaveChangesAsync(ct);
        return MapItem(item);
    }

    public async Task DeleteItemAsync(Guid userId, Guid itemId, CancellationToken ct = default)
    {
        var (_, item) = await LoadItemAsync(userId, itemId, ct);
        item.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }

    public async Task<VisionBoardItemResponse> CompleteItemAsync(Guid userId, Guid itemId, CompleteVisionBoardItemRequest request, CancellationToken ct = default)
    {
        var (_, item) = await LoadItemAsync(userId, itemId, ct);

        var wasAlreadyCompleted = item.IsCompleted;
        item.IsCompleted = true;
        item.CompletedAt ??= DateTime.UtcNow;
        item.CompletedNote = string.IsNullOrWhiteSpace(request.CompletedNote)
            ? null
            : request.CompletedNote.Trim();

        await db.SaveChangesAsync(ct);

        // Only notify on the transition into completed, not on re-saving a note.
        if (!wasAlreadyCompleted)
        {
            var actorName = item.CreatedBy?.DisplayName ?? "Your partner";
            await NotifyPartnerAsync(
                userId,
                NotificationTypes.VisionBoardItemCompleted,
                "We did it \u2764",
                $"{actorName} marked a shared vision as achieved.",
                item.Id,
                ct);
        }

        return MapItem(item);
    }

    public async Task<VisionBoardItemResponse> UncompleteItemAsync(Guid userId, Guid itemId, CancellationToken ct = default)
    {
        var (_, item) = await LoadItemAsync(userId, itemId, ct);
        item.IsCompleted = false;
        item.CompletedAt = null;
        item.CompletedNote = null;
        await db.SaveChangesAsync(ct);
        return MapItem(item);
    }

    public async Task<VisionBoardItemResponse> MoveItemAsync(Guid userId, Guid itemId, MoveVisionBoardItemRequest request, CancellationToken ct = default)
    {
        var (rel, item) = await LoadItemAsync(userId, itemId, ct);

        var target = await db.VisionBoardSections
            .FirstOrDefaultAsync(s => s.Id == request.SectionId && !s.IsDeleted, ct)
            ?? throw new NotFoundException("Vision board section", request.SectionId);
        if (target.RelationshipId != rel.Id) throw new UnauthorizedException();

        if (item.SectionId != target.Id)
        {
            var maxSort = await db.VisionBoardItems
                .Where(i => i.SectionId == target.Id && !i.IsDeleted)
                .Select(i => (int?)i.SortOrder)
                .MaxAsync(ct) ?? -1;

            item.SectionId = target.Id;
            item.SortOrder = maxSort + 1;
            await db.SaveChangesAsync(ct);
        }

        return MapItem(item);
    }

    public async Task<VisionBoardItemResponse> SetPinnedAsync(Guid userId, Guid itemId, PinVisionBoardItemRequest request, CancellationToken ct = default)
    {
        var (_, item) = await LoadItemAsync(userId, itemId, ct);
        item.IsPinned = request.IsPinned;
        await db.SaveChangesAsync(ct);
        return MapItem(item);
    }

    public async Task ReorderItemsAsync(Guid userId, ReorderVisionBoardItemsRequest request, CancellationToken ct = default)
    {
        var rel = await RequireRelationshipAsync(userId);
        if (request.ItemIds.Count == 0) return;

        var query = db.VisionBoardItems
            .Where(i => i.RelationshipId == rel.Id && !i.IsDeleted && request.ItemIds.Contains(i.Id));
        if (request.SectionId.HasValue)
            query = query.Where(i => i.SectionId == request.SectionId.Value);

        var items = await query.ToDictionaryAsync(i => i.Id, ct);

        var order = 0;
        foreach (var id in request.ItemIds)
        {
            if (items.TryGetValue(id, out var item))
                item.SortOrder = order++;
        }

        await db.SaveChangesAsync(ct);
    }

    // ── Sections ──────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<VisionBoardSectionResponse>> GetSectionsAsync(Guid userId, CancellationToken ct = default)
    {
        var rel = await RequireRelationshipAsync(userId);
        var sections = await EnsureSectionsAsync(rel.Id, ct);

        var activeCountBySection = await db.VisionBoardItems
            .Where(i => i.RelationshipId == rel.Id && !i.IsDeleted && !i.IsCompleted)
            .GroupBy(i => i.SectionId)
            .Select(g => new { SectionId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SectionId, x => x.Count, ct);

        return sections
            .Select(s => MapSection(s, activeCountBySection.GetValueOrDefault(s.Id, 0)))
            .ToList();
    }

    public async Task<VisionBoardSectionResponse> CreateSectionAsync(Guid userId, CreateVisionBoardSectionRequest request, CancellationToken ct = default)
    {
        var rel = await RequireRelationshipAsync(userId);
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ValidationException("Name is required.");

        // Seed defaults first so a custom section sorts after them.
        await EnsureSectionsAsync(rel.Id, ct);

        var maxSort = await db.VisionBoardSections
            .Where(s => s.RelationshipId == rel.Id && !s.IsDeleted)
            .Select(s => (int?)s.SortOrder)
            .MaxAsync(ct) ?? -1;

        var section = new VisionBoardSection
        {
            RelationshipId = rel.Id,
            Name = request.Name.Trim(),
            Description = request.Description,
            CoverImageFileKey = string.IsNullOrWhiteSpace(request.CoverImageFileKey) ? null : request.CoverImageFileKey.Trim(),
            SortOrder = maxSort + 1,
            IsDefault = false,
        };

        db.VisionBoardSections.Add(section);
        await db.SaveChangesAsync(ct);
        return MapSection(section, 0);
    }

    public async Task<VisionBoardSectionResponse> UpdateSectionAsync(Guid userId, Guid sectionId, UpdateVisionBoardSectionRequest request, CancellationToken ct = default)
    {
        var (rel, section) = await LoadSectionAsync(userId, sectionId, ct);

        if (request.Name != null)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ValidationException("Name cannot be empty.");
            section.Name = request.Name.Trim();
        }
        if (request.Description != null) section.Description = request.Description;
        if (request.CoverImageFileKey != null)
            section.CoverImageFileKey = string.IsNullOrWhiteSpace(request.CoverImageFileKey) ? null : request.CoverImageFileKey.Trim();

        await db.SaveChangesAsync(ct);

        var count = await db.VisionBoardItems
            .CountAsync(i => i.SectionId == section.Id && !i.IsDeleted && !i.IsCompleted, ct);
        return MapSection(section, count);
    }

    public async Task DeleteSectionAsync(Guid userId, Guid sectionId, CancellationToken ct = default)
    {
        var (rel, section) = await LoadSectionAsync(userId, sectionId, ct);

        var remainingSections = await db.VisionBoardSections
            .Where(s => s.RelationshipId == rel.Id && !s.IsDeleted && s.Id != section.Id)
            .OrderBy(s => s.SortOrder).ThenBy(s => s.CreatedAt)
            .ToListAsync(ct);

        if (remainingSections.Count == 0)
            throw new ConflictException("You can't delete your last section. Add another first, or move its items.");

        var items = await db.VisionBoardItems
            .Where(i => i.SectionId == section.Id && !i.IsDeleted)
            .ToListAsync(ct);

        // Relocate the deleted section's items into the first remaining section
        // rather than deleting them — the couple's vision shouldn't vanish with a
        // shelf. New items sort to the end of the destination.
        if (items.Count > 0)
        {
            var destination = remainingSections[0];
            var maxSort = await db.VisionBoardItems
                .Where(i => i.SectionId == destination.Id && !i.IsDeleted)
                .Select(i => (int?)i.SortOrder)
                .MaxAsync(ct) ?? -1;

            foreach (var item in items)
            {
                item.SectionId = destination.Id;
                item.SortOrder = ++maxSort;
            }
        }

        section.IsDeleted = true;
        await db.SaveChangesAsync(ct);
    }

    public async Task ReorderSectionsAsync(Guid userId, ReorderVisionBoardSectionsRequest request, CancellationToken ct = default)
    {
        var rel = await RequireRelationshipAsync(userId);
        if (request.SectionIds.Count == 0) return;

        var sections = await db.VisionBoardSections
            .Where(s => s.RelationshipId == rel.Id && !s.IsDeleted && request.SectionIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, ct);

        var order = 0;
        foreach (var id in request.SectionIds)
        {
            if (sections.TryGetValue(id, out var section))
                section.SortOrder = order++;
        }

        await db.SaveChangesAsync(ct);
    }

    // ── Notifications ──────────────────────────────────────────────────────────

    /// <summary>
    /// Best-effort partner activity notification. No-ops when the relationship
    /// has no second partner yet. Never exposes the item's private detail in the
    /// push text — just that something changed.
    /// </summary>
    private async Task NotifyPartnerAsync(
        Guid actorUserId, string type, string title, string body, Guid itemId, CancellationToken ct)
    {
        var partner = await relAccess.GetPartnerAsync(actorUserId);
        if (partner is null) return;

        await notifications.CreateAsync(
            partner.Id,
            title,
            body,
            notificationType: type,
            referenceId: itemId.ToString(),
            ct);
    }
}
