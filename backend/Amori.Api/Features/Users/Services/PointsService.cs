namespace Amori.Api.Features.Users.Services;
using System.Collections.Frozen;
using Amori.Api.Common.Exceptions;
using Amori.Api.Common.Responses;
using Amori.Api.Common.Time;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Domain.Enums;
using Amori.Api.Features.Users.DTOs;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Service for managing user gamification (points and badges).
/// </summary>
public sealed partial class PointsService(
    AmoriDbContext db,
    TimeProvider clock,
    IBadgeStatsService badgeStats,
    IClientLocalTimeAccessor localTime) : IPointsService
{
    /// <summary>
    /// What each activity is worth. The server owns these: a client that asks
    /// for points doesn't get to say how many.
    ///
    /// <see cref="ActivityType.ManualAdjustment"/> is absent on purpose — it
    /// carries its own amount and is the one case where the caller decides.
    /// </summary>
    private static readonly FrozenDictionary<ActivityType, int> PointValues =
        new Dictionary<ActivityType, int>
        {
            [ActivityType.HugSent] = 10,
            [ActivityType.HugHeld] = 5,
            [ActivityType.VisionAdded] = 10,
            [ActivityType.TodoAdded] = 10,
            [ActivityType.BucketListAdded] = 10,
            [ActivityType.MorningCheckIn] = 10,
            [ActivityType.SosFlowCompleted] = 20,
            [ActivityType.DailyGiftOpened] = 15,
            [ActivityType.CardCollected] = 10,
        }.ToFrozenDictionary();

    /// <summary>
    /// Levels that earn a badge. Note the gaps: 35 and 45 don't award, which is
    /// intentional and matches what shipped.
    /// </summary>
    private static readonly int[] BadgeThresholds = [5, 10, 15, 20, 25, 30, 40, 50];

    /// <summary>Upper bound on a history page, so a stray ?limit=1000000 can't hurt.</summary>
    private const int MaxHistoryLimit = 200;

    // ─── Server-side awarding ────────────────────────────────────────────────

    public async Task<PointsAwardResult> AwardAsync(
        Guid userId,
        ActivityType activityType,
        ClientLocalTime localTime,
        bool oncePerLocalDay = false,
        Guid? referenceId = null,
        string? metadata = null,
        CancellationToken ct = default)
    {
        if (!PointValues.TryGetValue(activityType, out var amount))
            return PointsAwardResult.NotAwarded;

        if (oncePerLocalDay && await AlreadyCreditedTodayAsync(userId, activityType, localTime.LocalDate, ct))
            return PointsAwardResult.NotAwarded;

        return await ApplyAsync(userId, activityType, amount, localTime.LocalDate, referenceId, metadata, ct);
    }

    /// <summary>
    /// Has this activity already been credited on the user's current local day?
    ///
    /// Matched on the stored local date rather than by converting
    /// <c>created_at</c> back through an offset: the user's offset can change
    /// between the two awards (travel, DST), and a converted timestamp would
    /// then land on the wrong day.
    /// </summary>
    private async Task<bool> AlreadyCreditedTodayAsync(
        Guid userId, ActivityType activityType, DateOnly localDate, CancellationToken ct) =>
        await db.PointsHistory
            .AsNoTracking()
            .AnyAsync(h => h.UserId == userId
                        && h.ActivityType == activityType
                        && h.LocalDate == localDate, ct);

    // ─── Manual adjustment (support / testing) ───────────────────────────────

    public async Task<AddPointsResponse> AddPointsAsync(
        Guid userId, AddPointsRequest request, CancellationToken ct = default)
    {
        // Everything else is earned by doing the thing, not by asking for it.
        if (request.ActivityType != ActivityType.ManualAdjustment)
            throw new ValidationException(
                $"Only {nameof(ActivityType.ManualAdjustment)} may be posted. " +
                $"'{request.ActivityType}' points are awarded by the server when the activity happens.");

        if (request.Amount == 0)
            throw new ValidationException("Amount must not be zero.");

        var result = await ApplyAsync(
            userId,
            ActivityType.ManualAdjustment,
            request.Amount,
            // A manual adjustment is an operator action, so the operator's own
            // local date is the honest thing to stamp it with.
            DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime),
            request.ReferenceId,
            request.Metadata,
            ct);

        return new AddPointsResponse
        {
            PointsAwarded = result.PointsAwarded,
            NewTotalPoints = result.TotalPoints,
            NewLevel = result.NewLevel,
            PreviousLevel = result.PreviousLevel,
            LeveledUp = result.LeveledUp,
            NewBadge = result.NewBadges.Count > 0 ? result.NewBadges[^1] : null,
            Points = ToPointsResponse(result.TotalPoints),
        };
    }

    // ─── The one write path ──────────────────────────────────────────────────

    /// <summary>One line of points to credit: an activity, its amount and audit detail.</summary>
    private sealed record PointsEntry(
        ActivityType ActivityType, int Amount, DateOnly LocalDate, Guid? ReferenceId, string? Metadata);

    private Task<PointsAwardResult> ApplyAsync(
        Guid userId,
        ActivityType activityType,
        int amount,
        DateOnly localDate,
        Guid? referenceId,
        string? metadata,
        CancellationToken ct) =>
        ApplyAsync(userId, [new PointsEntry(activityType, amount, localDate, referenceId, metadata)], ct);

    /// <summary>
    /// Credit one or more entries in a single <c>SaveChangesAsync</c>, together
    /// with anything else the caller has already queued on the context (e.g.
    /// the badge rows being saved). One history row per entry.
    /// </summary>
    private async Task<PointsAwardResult> ApplyAsync(
        Guid userId, IReadOnlyList<PointsEntry> entries, CancellationToken ct)
    {
        if (!await db.Users.AnyAsync(u => u.Id == userId, ct))
            throw new NotFoundException("User", userId);

        var userPoints = await db.UserPoints.FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (userPoints is null)
        {
            // First points this user has ever earned. This has to be an
            // explicit Add: BaseEntity seeds Id in its initialiser, so testing
            // for an empty Id (as this used to) is always false and the row was
            // silently never inserted — the user stayed on zero forever while
            // their history filled up.
            userPoints = new UserPoints { UserId = userId };
            db.UserPoints.Add(userPoints);
        }

        var previousLevel = CalculateLevel(userPoints.TotalPoints);
        var awarded = 0;

        foreach (var entry in entries)
        {
            // Floor at zero so a negative manual adjustment can't drive a user
            // into debt, which CalculateLevel has no sensible answer for.
            userPoints.TotalPoints = Math.Max(0, userPoints.TotalPoints + entry.Amount);
            awarded += entry.Amount;

            db.PointsHistory.Add(new PointsHistory
            {
                UserId = userId,
                ActivityType = entry.ActivityType,
                PointsAwarded = entry.Amount,
                TotalPointsAfter = userPoints.TotalPoints,
                LocalDate = entry.LocalDate,
                ReferenceId = entry.ReferenceId,
                Metadata = entry.Metadata,
            });
        }

        userPoints.Level = CalculateLevel(userPoints.TotalPoints);
        userPoints.LastPointsAddedAt = clock.GetUtcNow().UtcDateTime;

        // Every threshold crossed, not just the level landed on. A single
        // award can span several levels, and the old code only looked at the
        // final one — so a jump from 4 to 11 awarded nothing at all.
        var newBadges = await AwardLevelBadgesAsync(userId, previousLevel, userPoints.Level, ct);

        // One round trip for points, history and badges together, so a failure
        // can't leave the three disagreeing.
        await db.SaveChangesAsync(ct);

        return new PointsAwardResult(
            Awarded: true,
            PointsAwarded: awarded,
            TotalPoints: userPoints.TotalPoints,
            PreviousLevel: previousLevel,
            NewLevel: userPoints.Level,
            NewBadges: newBadges);
    }

    private static RewardsResponse ToRewards(PointsAwardResult award) => new()
    {
        PointsAwarded = award.PointsAwarded,
        TotalPoints = award.TotalPoints,
        LeveledUp = award.LeveledUp,
        NewLevel = award.LeveledUp ? award.NewLevel : null,
        NewBadges = [],
    };

    /// <summary>
    /// Queue up a badge for every threshold between the old and new level.
    /// Adds to the change tracker without saving — the caller's single
    /// <c>SaveChangesAsync</c> commits them alongside the points.
    /// </summary>
    private async Task<List<BadgeResponse>> AwardLevelBadgesAsync(
        Guid userId, int previousLevel, int newLevel, CancellationToken ct)
    {
        var awarded = new List<BadgeResponse>();
        if (newLevel <= previousLevel) return awarded;

        var crossed = BadgeThresholds.Where(t => t > previousLevel && t <= newLevel).ToArray();
        if (crossed.Length == 0) return awarded;

        var alreadyHeld = await db.Badges
            .Where(b => b.UserId == userId && crossed.Contains(b.AwardedAtLevel))
            .Select(b => b.AwardedAtLevel)
            .ToListAsync(ct);

        foreach (var level in crossed.Except(alreadyHeld))
        {
            var badge = new Badge
            {
                UserId = userId,
                BadgeName = $"Level {level}",
                Description = $"Reached Level {level}",
                AwardedAtLevel = level,
                EarnedAt = clock.GetUtcNow().UtcDateTime,
                ImageKey = $"badges/level-{level}.png",
                ImageUrl = null,
            };

            db.Badges.Add(badge);
            awarded.Add(ToBadgeResponse(badge));
        }

        return awarded;
    }

    // ─── Reads ───────────────────────────────────────────────────────────────

    public async Task<UserPointsResponse> GetUserPointsAsync(Guid userId, CancellationToken ct = default)
    {
        var total = await db.UserPoints
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => (int?)p.TotalPoints)
            .FirstOrDefaultAsync(ct);

        // No row yet simply means no points yet, which is a valid state to
        // report rather than a 404.
        return ToPointsResponse(total ?? 0);
    }

    public async Task<List<BadgeResponse>> GetUserBadgesAsync(Guid userId, CancellationToken ct = default) =>
        await db.Badges
            .AsNoTracking()
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.EarnedAt)
            .Select(b => new BadgeResponse
            {
                Id = b.Id,
                Slug = b.Slug,
                BadgeName = b.BadgeName,
                Description = b.Description,
                AwardedAtLevel = b.AwardedAtLevel,
                ImageUrl = b.ImageUrl,
                IsArchivedInVault = b.IsArchivedInVault,
                EarnedAt = b.EarnedAt,
            })
            .ToListAsync(ct);

    public Task<BadgeResponse> ArchiveBadgeToVaultAsync(
        Guid userId, string badgeKey, CancellationToken ct = default) =>
        // Level badges are server rows, addressed by id. Catalogue badges are
        // unlocked from progress counters and addressed by the app's slug.
        Guid.TryParse(badgeKey, out var badgeId)
            ? ArchiveLevelBadgeAsync(userId, badgeId, ct)
            : ArchiveCatalogueBadgeAsync(userId, badgeKey, ct);

    private async Task<BadgeResponse> ArchiveLevelBadgeAsync(
        Guid userId, Guid badgeId, CancellationToken ct)
    {
        // Scoped by UserId rather than loaded then checked: someone else's
        // badge should be indistinguishable from one that doesn't exist.
        var badge = await db.Badges.FirstOrDefaultAsync(b => b.Id == badgeId && b.UserId == userId, ct)
            ?? throw new NotFoundException("Badge", badgeId);

        if (!badge.IsArchivedInVault)
        {
            badge.IsArchivedInVault = true;
            await db.SaveChangesAsync(ct);
        }

        return ToBadgeResponse(badge);
    }

    /// <summary>
    /// Save a catalogue badge to the vault, recording it the first time.
    ///
    /// The app works out which catalogue badges are unlocked from
    /// /badge-stats, so the server has no row for one until it's saved. Before
    /// creating that row the same counters are checked against the badge's
    /// rule here — a client can't vault a badge it hasn't earned.
    ///
    /// The first save also pays the badge's <see cref="BadgeCatalog.Entry.PointsReward"/>
    /// (as <see cref="ActivityType.BadgeSaved"/>), committed in the same save as
    /// the badge row: the unique (user, slug) index is what makes it once-only.
    /// Repeat saves return the badge with no reward.
    /// </summary>
    private async Task<BadgeResponse> ArchiveCatalogueBadgeAsync(
        Guid userId, string slug, CancellationToken ct)
    {
        var entry = BadgeCatalog.Find(slug)
            ?? throw new NotFoundException("Badge", slug);

        var existing = await db.Badges
            .FirstOrDefaultAsync(b => b.UserId == userId && b.Slug == entry.Slug, ct);
        if (existing is not null) return await MarkArchivedAsync(existing, ct);

        var stats = await badgeStats.GetBadgeStatsAsync(userId, ct);
        if (!BadgeCatalog.IsUnlocked(entry, stats))
            throw new ConflictException("You haven't earned this badge yet.");

        var badge = new Badge
        {
            UserId = userId,
            Slug = entry.Slug,
            // Display text lives in the app's registry; the slug is the name
            // the server knows it by.
            BadgeName = entry.Slug,
            Description = string.Empty,
            AwardedAtLevel = 0,
            EarnedAt = clock.GetUtcNow().UtcDateTime,
            IsArchivedInVault = true,
        };
        db.Badges.Add(badge);

        try
        {
            // ApplyAsync's single SaveChangesAsync commits the badge row, the
            // points, the history entry and any level badges together.
            var award = await ApplyAsync(
                userId,
                ActivityType.BadgeSaved,
                entry.PointsReward,
                localTime.Current.LocalDate,
                badge.Id,
                metadata: entry.Slug,
                ct);

            var response = ToBadgeResponse(badge);
            response.Rewards = ToRewards(award);
            return response;
        }
        catch (DbUpdateException)
        {
            // Two saves raced (a double tap): the unique (user, slug) index let
            // exactly one through, and only that one paid out. Drop everything
            // this attempt queued (badge, points, history) and return the winner.
            db.ChangeTracker.Clear();
            var winner = await db.Badges
                .FirstOrDefaultAsync(b => b.UserId == userId && b.Slug == entry.Slug, ct);
            if (winner is null) throw;
            return await MarkArchivedAsync(winner, ct);
        }
    }

    private async Task<BadgeResponse> MarkArchivedAsync(Badge badge, CancellationToken ct)
    {
        if (!badge.IsArchivedInVault)
        {
            badge.IsArchivedInVault = true;
            await db.SaveChangesAsync(ct);
        }
        return ToBadgeResponse(badge);
    }

    public async Task<List<PointsHistoryEntryResponse>> GetPointsHistoryAsync(
        Guid userId, int limit = 50, CancellationToken ct = default) =>
        await db.PointsHistory
            .AsNoTracking()
            .Where(h => h.UserId == userId)
            .OrderByDescending(h => h.CreatedAt)
            .Take(Math.Clamp(limit, 1, MaxHistoryLimit))
            .Select(h => new PointsHistoryEntryResponse
            {
                Id = h.Id,
                ActivityType = h.ActivityType,
                PointsAwarded = h.PointsAwarded,
                TotalPointsAfter = h.TotalPointsAfter,
                LocalDate = h.LocalDate,
                CreatedAt = h.CreatedAt,
                Metadata = h.Metadata,
            })
            .ToListAsync(ct);

    // ─── Level maths ─────────────────────────────────────────────────────────

    /// <summary>
    /// Level from total points. Each level costs <c>level × 100</c> more than
    /// the last, so the cumulative cost runs 100 / 300 / 600 / 1000 / 1500 …
    /// </summary>
    private static int CalculateLevel(int totalPoints)
    {
        if (totalPoints < 100) return 1;

        var level = 1;
        var pointsUsed = 0;

        while (pointsUsed + (level * 100) <= totalPoints)
        {
            pointsUsed += level * 100;
            level++;
        }

        return level;
    }

    private static UserPointsResponse ToPointsResponse(int totalPoints)
    {
        var level = CalculateLevel(totalPoints);

        var pointsUsed = 0;
        for (var i = 1; i < level; i++) pointsUsed += i * 100;

        var pointsInCurrentLevel = totalPoints - pointsUsed;
        var pointsNeededForLevel = level * 100;

        return new UserPointsResponse
        {
            TotalPoints = totalPoints,
            Level = level,
            PointsInCurrentLevel = pointsInCurrentLevel,
            PointsNeededForLevel = pointsNeededForLevel,
            ProgressPercentage = Math.Min(
                (int)Math.Round(pointsInCurrentLevel / (double)pointsNeededForLevel * 100), 100),
        };
    }

    private static BadgeResponse ToBadgeResponse(Badge badge) => new()
    {
        Id = badge.Id,
        Slug = badge.Slug,
        BadgeName = badge.BadgeName,
        Description = badge.Description,
        AwardedAtLevel = badge.AwardedAtLevel,
        ImageUrl = badge.ImageUrl,
        IsArchivedInVault = badge.IsArchivedInVault,
        EarnedAt = badge.EarnedAt,
    };
}
