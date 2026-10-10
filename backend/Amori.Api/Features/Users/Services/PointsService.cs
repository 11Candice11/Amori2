namespace Amori.Api.Features.Users.Services;
using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Domain.Enums;
using Amori.Api.Features.Users.DTOs;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

/// <summary>
/// Service for managing user gamification (points and badges).
/// </summary>
public sealed class PointsService(AmoriDbContext db) : IPointsService
{
    /// <summary>
    /// Levels where badges are awarded (e.g., 5, 10, 15, 20, etc.)
    /// Badges are given every 5 levels.
    /// </summary>
    private static readonly int[] BadgeThresholds = [5, 10, 15, 20, 25, 30, 40, 50];

    public async Task<AddPointsResponse> AddPointsAsync(Guid userId, AddPointsRequest request, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct)
            ?? throw new NotFoundException("User", userId);

        // Get or create UserPoints entry
        var userPoints = await db.Set<UserPoints>().FirstOrDefaultAsync(p => p.UserId == userId, ct)
            ?? new UserPoints { UserId = userId };

        var previousLevel = CalculateLevel(userPoints.TotalPoints);
        var previousTotal = userPoints.TotalPoints;

        // Add points
        userPoints.TotalPoints += request.Amount;
        userPoints.Level = CalculateLevel(userPoints.TotalPoints);
        userPoints.LastPointsAddedAt = DateTime.UtcNow;

        // Record in history
        var history = new PointsHistory
        {
            UserId = userId,
            ActivityType = request.ActivityType,
            PointsAwarded = request.Amount,
            TotalPointsAfter = userPoints.TotalPoints,
            ReferenceId = request.ReferenceId,
            Metadata = request.Metadata,
        };

        // Save user points if it's new
        if (userPoints.Id == Guid.Empty)
        {
            userPoints.Id = Guid.NewGuid();
            db.Set<UserPoints>().Add(userPoints);
        }

        db.Set<PointsHistory>().Add(history);

        BadgeResponse? newBadge = null;
        var leveledUp = userPoints.Level > previousLevel;

        // Check if user leveled up and reached a badge threshold
        if (leveledUp && BadgeThresholds.Contains(userPoints.Level))
        {
            newBadge = await AwardBadgeAsync(userId, userPoints.Level, ct);
        }

        await db.SaveChangesAsync(ct);

        return new AddPointsResponse
        {
            PointsAwarded = request.Amount,
            NewTotalPoints = userPoints.TotalPoints,
            NewLevel = userPoints.Level,
            PreviousLevel = previousLevel,
            LeveledUp = leveledUp,
            NewBadge = newBadge,
            Points = ToPointsResponse(userPoints),
        };
    }

    public async Task<UserPointsResponse> GetUserPointsAsync(Guid userId, CancellationToken ct = default)
    {
        var userPoints = await db.Set<UserPoints>().FirstOrDefaultAsync(p => p.UserId == userId, ct);
        
        if (userPoints == null)
        {
            // User hasn't earned any points yet
            return ToPointsResponse(new UserPoints { UserId = userId, TotalPoints = 0 });
        }

        return ToPointsResponse(userPoints);
    }

    public async Task<List<BadgeResponse>> GetUserBadgesAsync(Guid userId, CancellationToken ct = default)
    {
        var badges = await db.Set<Badge>()
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.EarnedAt)
            .ToListAsync(ct);

        return badges.Select(ToBadgeResponse).ToList();
    }

    public async Task<BadgeResponse> ArchiveBadgeToVaultAsync(Guid userId, Guid badgeId, CancellationToken ct = default)
    {
        var badge = await db.Set<Badge>().FirstOrDefaultAsync(b => b.Id == badgeId && b.UserId == userId, ct)
            ?? throw new NotFoundException("Badge", badgeId);

        badge.IsArchivedInVault = true;
        await db.SaveChangesAsync(ct);

        return ToBadgeResponse(badge);
    }

    public async Task<List<object>> GetPointsHistoryAsync(Guid userId, int limit = 50, CancellationToken ct = default)
    {
        var history = await db.Set<PointsHistory>()
            .Where(h => h.UserId == userId)
            .OrderByDescending(h => h.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

        return history.Select(h => (object)new
        {
            h.Id,
            h.ActivityType,
            h.PointsAwarded,
            h.TotalPointsAfter,
            h.CreatedAt,
            h.Metadata,
        }).ToList();
    }

    private async Task<BadgeResponse> AwardBadgeAsync(Guid userId, int level, CancellationToken ct)
    {
        // Check if badge already exists
        var existing = await db.Set<Badge>()
            .FirstOrDefaultAsync(b => b.UserId == userId && b.AwardedAtLevel == level, ct);

        if (existing != null)
            return ToBadgeResponse(existing);

        var badge = new Badge
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BadgeName = $"Level {level}",
            Description = $"Reached Level {level}",
            AwardedAtLevel = level,
            EarnedAt = DateTime.UtcNow,
            ImageKey = $"badges/level-{level}.png",
            // Image URL will be populated by the client or set to a placeholder
            ImageUrl = null,
        };

        db.Set<Badge>().Add(badge);
        await db.SaveChangesAsync(ct);

        return ToBadgeResponse(badge);
    }

    /// <summary>
    /// Calculate level from total points.
    /// Formula: Points needed for level N = N × 100
    /// Level 1: 0-99, Level 2: 100-199 (needs 200 total), etc.
    /// </summary>
    private static int CalculateLevel(int totalPoints)
    {
        if (totalPoints < 100) return 1;
        
        int level = 1;
        int pointsUsed = 0;

        while (pointsUsed + (level * 100) <= totalPoints)
        {
            pointsUsed += level * 100;
            level++;
        }

        return level;
    }

    private static UserPointsResponse ToPointsResponse(UserPoints userPoints)
    {
        var level = CalculateLevel(userPoints.TotalPoints);
        
        // Calculate points in current level
        int pointsUsed = 0;
        for (int i = 1; i < level; i++)
        {
            pointsUsed += i * 100;
        }

        var pointsInCurrentLevel = userPoints.TotalPoints - pointsUsed;
        var pointsNeededForLevel = level * 100;
        var progressPercentage = pointsNeededForLevel > 0
            ? (int)Math.Round((pointsInCurrentLevel / (double)pointsNeededForLevel) * 100)
            : 0;

        return new UserPointsResponse
        {
            TotalPoints = userPoints.TotalPoints,
            Level = level,
            PointsInCurrentLevel = pointsInCurrentLevel,
            PointsNeededForLevel = pointsNeededForLevel,
            ProgressPercentage = Math.Min(progressPercentage, 100),
        };
    }

    private static BadgeResponse ToBadgeResponse(Badge badge) => new()
    {
        Id = badge.Id,
        BadgeName = badge.BadgeName,
        Description = badge.Description,
        AwardedAtLevel = badge.AwardedAtLevel,
        ImageUrl = badge.ImageUrl,
        IsArchivedInVault = badge.IsArchivedInVault,
        EarnedAt = badge.EarnedAt,
    };
}
