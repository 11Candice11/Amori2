namespace Amori.Api.Features.Users.Services;
using System.Text.Json;
using Amori.Api.Common.Responses;
using Amori.Api.Domain.Entities;
using Amori.Api.Domain.Enums;
using Amori.Api.Features.Users.DTOs;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// The one-off catch-up for users who were active before points were awarded
/// server-side, and saving several badges at once.
/// </summary>
public sealed partial class PointsService
{
    /// <summary>Upper bound on one bulk save, so a malformed request can't be huge.</summary>
    private const int MaxBulkArchive = 100;

    /// <summary>Hugs held at least this long earned the "hug held" points (HugService).</summary>
    private const int HugHeldThresholdMs = 3_000;

    // ─── History backfill ────────────────────────────────────────────────────

    public async Task<CatchUpResponse> RunHistoryBackfillAsync(Guid userId, CancellationToken ct = default)
    {
        if (await db.PointsHistory.AnyAsync(
                h => h.UserId == userId && h.ActivityType == ActivityType.HistoryBackfill, ct))
            return new CatchUpResponse { FirstRun = false };

        var lines = await CountUncreditedHistoryAsync(userId, ct);
        var total = lines.Sum(l => l.Points);

        // Always write the marker, even for 0 points: it records that the
        // backfill ran, and its unique index is what makes it once-only.
        var metadata = JsonSerializer.Serialize(
            lines.ToDictionary(l => l.ActivityType.ToString(), l => new { l.Count, l.Points }));

        try
        {
            var award = await ApplyAsync(
                userId,
                ActivityType.HistoryBackfill,
                total,
                localTime.Current.LocalDate,
                referenceId: null,
                metadata,
                ct);

            return new CatchUpResponse
            {
                FirstRun = true,
                Breakdown = lines,
                Rewards = total > 0 ? ToRewards(award) : RewardsResponse.None,
            };
        }
        catch (DbUpdateException)
        {
            // Another request ran it first (two devices opening at once). That
            // one credited the points and owns the "first run".
            db.ChangeTracker.Clear();
            return new CatchUpResponse { FirstRun = false };
        }
    }

    /// <summary>
    /// What the user did that earns points but was never credited — everything
    /// before server-side awarding, minus anything awarded live since (matched
    /// on the history row's ReferenceId, so nothing is paid twice).
    /// </summary>
    private async Task<List<BackfillLine>> CountUncreditedHistoryAsync(Guid userId, CancellationToken ct)
    {
        var credited = await db.PointsHistory
            .AsNoTracking()
            .Where(h => h.UserId == userId && h.ReferenceId != null)
            .Select(h => new { h.ActivityType, ReferenceId = h.ReferenceId!.Value })
            .ToListAsync(ct);

        HashSet<Guid> CreditedFor(ActivityType type) =>
            credited.Where(c => c.ActivityType == type).Select(c => c.ReferenceId).ToHashSet();

        var counts = new Dictionary<ActivityType, int>();

        // Hugs sent, and the "held" bonus for long holds.
        var hugs = await db.Hugs
            .AsNoTracking()
            .Where(h => h.SenderId == userId)
            .Select(h => new { h.Id, h.HoldDurationMs })
            .ToListAsync(ct);
        var hugSent = CreditedFor(ActivityType.HugSent);
        var hugHeld = CreditedFor(ActivityType.HugHeld);
        counts[ActivityType.HugSent] = hugs.Count(h => !hugSent.Contains(h.Id));
        counts[ActivityType.HugHeld] = hugs.Count(h =>
            h.HoldDurationMs >= HugHeldThresholdMs && !hugHeld.Contains(h.Id));

        // Vision board items added (still on the board).
        var visions = await db.VisionBoardItems
            .AsNoTracking()
            .Where(v => v.CreatedByUserId == userId && !v.IsDeleted)
            .Select(v => v.Id)
            .ToListAsync(ct);
        var visionCredited = CreditedFor(ActivityType.VisionAdded);
        counts[ActivityType.VisionAdded] = visions.Count(id => !visionCredited.Contains(id));

        // Bucket-list items and to-dos (same table, split by category).
        var bucket = await db.BucketListItems
            .AsNoTracking()
            .Where(b => b.AddedByUserId == userId)
            .Select(b => new { b.Id, b.Category })
            .ToListAsync(ct);
        var todoCredited = CreditedFor(ActivityType.TodoAdded);
        var bucketCredited = CreditedFor(ActivityType.BucketListAdded);
        counts[ActivityType.TodoAdded] = bucket.Count(b =>
            b.Category == BucketListCategory.ToDoList && !todoCredited.Contains(b.Id));
        counts[ActivityType.BucketListAdded] = bucket.Count(b =>
            b.Category != BucketListCategory.ToDoList && !bucketCredited.Contains(b.Id));

        // SOS / splitting sessions finished.
        var sessions = await db.SplittingSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == SplittingSessionStatus.Completed)
            .Select(s => s.Id)
            .ToListAsync(ct);
        var sosCredited = CreditedFor(ActivityType.SosFlowCompleted);
        counts[ActivityType.SosFlowCompleted] = sessions.Count(id => !sosCredited.Contains(id));

        // Daily check-in: once per day. Old check-ins have no local date, so
        // their UTC date stands in; days already credited live are skipped.
        var checkIns = await db.MoodCheckIns
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .Select(m => new { m.Id, m.CreatedAt })
            .ToListAsync(ct);
        var checkInCredited = CreditedFor(ActivityType.MorningCheckIn);
        var creditedDays = (await db.PointsHistory
                .AsNoTracking()
                .Where(h => h.UserId == userId && h.ActivityType == ActivityType.MorningCheckIn)
                .Select(h => h.LocalDate)
                .ToListAsync(ct))
            .ToHashSet();
        counts[ActivityType.MorningCheckIn] = checkIns
            .Where(c => !checkInCredited.Contains(c.Id))
            .Select(c => DateOnly.FromDateTime(c.CreatedAt))
            .Distinct()
            .Count(day => !creditedDays.Contains(day));

        // Gift cards sent to the partner via "Send a gift" (a gift-only memory
        // the user created, in someone else's vault). Gifts sent from an
        // existing memory don't record the sender, so they can't be counted.
        var gifts = await db.VaultGifts
            .AsNoTracking()
            .Where(g => g.UserId != userId && g.Memory != null &&
                        g.Memory.IsGiftOnly && g.Memory.CreatedByUserId == userId)
            .Select(g => g.Id)
            .ToListAsync(ct);
        var giftCredited = CreditedFor(ActivityType.CardCollected);
        counts[ActivityType.CardCollected] = gifts.Count(id => !giftCredited.Contains(id));

        // DailyGiftOpened is not backfilled: opening the daily gift was never
        // recorded on the server.

        return counts
            .Where(kv => kv.Value > 0)
            .Select(kv => new BackfillLine
            {
                ActivityType = kv.Key,
                Count = kv.Value,
                Points = kv.Value * PointValues[kv.Key],
            })
            .OrderByDescending(l => l.Points)
            .ToList();
    }

    // ─── Save several catalogue badges ───────────────────────────────────────

    public async Task<ArchiveBadgesResponse> ArchiveCatalogueBadgesAsync(
        Guid userId, IReadOnlyCollection<string> slugs, CancellationToken ct = default)
    {
        var requested = slugs
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .Distinct(StringComparer.Ordinal)
            .Take(MaxBulkArchive)
            .ToList();

        var entries = requested.Select(BadgeCatalog.Find).Where(e => e is not null).Select(e => e!).ToList();
        var skipped = requested.Where(s => BadgeCatalog.Find(s) is null).ToList();
        if (entries.Count == 0)
            return new ArchiveBadgesResponse { Skipped = skipped };

        var entrySlugs = entries.Select(e => e.Slug).ToList();
        var existing = await db.Badges
            .Where(b => b.UserId == userId && b.Slug != null && entrySlugs.Contains(b.Slug))
            .ToListAsync(ct);
        var existingBySlug = existing.ToDictionary(b => b.Slug!, StringComparer.Ordinal);

        // One stats computation for the whole batch, not one per badge.
        var stats = await badgeStats.GetBadgeStatsAsync(userId, ct);
        var now = clock.GetUtcNow().UtcDateTime;
        var localDate = localTime.Current.LocalDate;

        var newBadges = new List<(Badge Badge, BadgeCatalog.Entry Entry)>();
        foreach (var entry in entries)
        {
            if (existingBySlug.TryGetValue(entry.Slug, out var row))
            {
                row.IsArchivedInVault = true;
                continue;
            }

            if (!BadgeCatalog.IsUnlocked(entry, stats))
            {
                skipped.Add(entry.Slug);
                continue;
            }

            var badge = new Badge
            {
                UserId = userId,
                Slug = entry.Slug,
                BadgeName = entry.Slug,
                Description = string.Empty,
                AwardedAtLevel = 0,
                EarnedAt = now,
                IsArchivedInVault = true,
            };
            db.Badges.Add(badge);
            newBadges.Add((badge, entry));
        }

        try
        {
            RewardsResponse rewards = RewardsResponse.None;
            if (newBadges.Count > 0)
            {
                var award = await ApplyAsync(
                    userId,
                    newBadges
                        .Select(n => new PointsEntry(
                            ActivityType.BadgeSaved, n.Entry.PointsReward, localDate, n.Badge.Id, n.Entry.Slug))
                        .ToList(),
                    ct);
                rewards = ToRewards(award);
            }
            else
            {
                await db.SaveChangesAsync(ct);
            }

            return new ArchiveBadgesResponse
            {
                Saved = existing.Concat(newBadges.Select(n => n.Badge)).Select(ToBadgeResponse).ToList(),
                Skipped = skipped,
                Rewards = rewards,
            };
        }
        catch (DbUpdateException)
        {
            // A concurrent save beat us to at least one badge. Fall back to
            // saving one at a time; each is idempotent and pays at most once.
            db.ChangeTracker.Clear();
            return await ArchiveOneByOneAsync(userId, entries.Select(e => e.Slug).Except(skipped), skipped, ct);
        }
    }

    private async Task<ArchiveBadgesResponse> ArchiveOneByOneAsync(
        Guid userId, IEnumerable<string> slugs, List<string> skipped, CancellationToken ct)
    {
        var saved = new List<BadgeResponse>();
        var points = 0;
        int? total = null;
        int? newLevel = null;

        foreach (var slug in slugs)
        {
            try
            {
                var badge = await ArchiveCatalogueBadgeAsync(userId, slug, ct);
                saved.Add(badge);
                if (badge.Rewards is { } r && r.PointsAwarded > 0)
                {
                    points += r.PointsAwarded;
                    total = r.TotalPoints;
                    newLevel = r.NewLevel ?? newLevel;
                }
                badge.Rewards = null;
            }
            catch (Common.Exceptions.ConflictException)
            {
                skipped.Add(slug);
            }
        }

        return new ArchiveBadgesResponse
        {
            Saved = saved,
            Skipped = skipped,
            Rewards = points == 0
                ? RewardsResponse.None
                : new RewardsResponse
                {
                    PointsAwarded = points,
                    TotalPoints = total,
                    LeveledUp = newLevel is not null,
                    NewLevel = newLevel,
                    NewBadges = [],
                },
        };
    }
}
