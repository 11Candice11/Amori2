using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Domain.ValueObjects;
using Amori.Api.Features.WeeklyReflection.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Amori.Api.Features.WeeklyReflection.Services;

public sealed class WeeklyReflectionArchiveService(AmoriDbContext db)
    : IWeeklyReflectionArchiveService
{
    /// <summary>Bound on stored days so a malformed client can't bloat a row.</summary>
    private const int MaxDays = 7;

    public async Task<IReadOnlyList<WeeklyReflectionArchiveResponse>> GetAllAsync(
        Guid userId, CancellationToken ct = default)
    {
        var entries = await db.WeeklyReflectionArchives
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            // WeekKey is "YYYY-MM-DD", so a lexical sort is also chronological.
            .OrderByDescending(a => a.WeekKey)
            .ToListAsync(ct);

        return entries.Select(Map).ToList();
    }

    public async Task<WeeklyReflectionArchiveResponse> GetByWeekKeyAsync(
        Guid userId, string weekKey, CancellationToken ct = default)
    {
        var entry = await LoadOwnAsync(userId, weekKey, ct);
        return Map(entry);
    }

    public async Task<WeeklyReflectionArchiveResponse> SaveAsync(
        Guid userId, SaveWeeklyReflectionRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.WeekKey))
            throw new ValidationException("WeekKey is required.");
        if (!IsWeekKey(request.WeekKey))
            throw new ValidationException("WeekKey must be a date in the form YYYY-MM-DD.");
        if (string.IsNullOrWhiteSpace(request.RangeLabel))
            throw new ValidationException("RangeLabel is required.");

        var snapshot = ToSnapshot(request.Snapshot);

        // Upsert on (user, week): re-saving a week refreshes its snapshot rather
        // than duplicating, matching the client's one-entry-per-week model and
        // the unique index in WeeklyReflectionArchiveConfiguration.
        var existing = await db.WeeklyReflectionArchives
            .FirstOrDefaultAsync(a => a.UserId == userId && a.WeekKey == request.WeekKey, ct);

        if (existing is null)
        {
            existing = new WeeklyReflectionArchive
            {
                UserId = userId,
                WeekKey = request.WeekKey,
                RangeLabel = request.RangeLabel,
                MoodDataPartial = request.MoodDataPartial,
                Snapshot = snapshot,
            };
            db.WeeklyReflectionArchives.Add(existing);
        }
        else
        {
            existing.RangeLabel = request.RangeLabel;
            existing.MoodDataPartial = request.MoodDataPartial;
            existing.Snapshot = snapshot;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return Map(existing);
    }

    public async Task RemoveAsync(Guid userId, string weekKey, CancellationToken ct = default)
    {
        var entry = await LoadOwnAsync(userId, weekKey, ct);
        db.WeeklyReflectionArchives.Remove(entry);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Loads one of the caller's own archives, scoping by UserId rather than
    /// loading then comparing — a reflection belonging to the partner should be
    /// indistinguishable from one that doesn't exist (same posture as the vault).
    /// </summary>
    private async Task<WeeklyReflectionArchive> LoadOwnAsync(Guid userId, string weekKey, CancellationToken ct) =>
        await db.WeeklyReflectionArchives
            .FirstOrDefaultAsync(a => a.UserId == userId && a.WeekKey == weekKey, ct)
            ?? throw new NotFoundException("Saved reflection", weekKey);

    /// <summary>Loose YYYY-MM-DD shape check (the client owns exact week math).</summary>
    private static bool IsWeekKey(string value) =>
        System.Text.RegularExpressions.Regex.IsMatch(value, @"^\d{4}-\d{2}-\d{2}$");

    // ── Mapping (DTO ⇄ value object) ───────────────────────────────────────────

    private static WeeklyReflectionArchiveResponse Map(WeeklyReflectionArchive a) => new()
    {
        WeekKey = a.WeekKey,
        RangeLabel = a.RangeLabel,
        // CreatedAt is the moment it was first saved; keep it stable as "SavedAt".
        SavedAt = a.CreatedAt,
        MoodDataPartial = a.MoodDataPartial,
        Snapshot = ToDto(a.Snapshot),
    };

    private static WeeklyReflectionSnapshot ToSnapshot(WeeklyReflectionSnapshotDto dto) => new()
    {
        Days = dto.Days.Take(MaxDays).Select(d => new WeeklyReflectionDay
        {
            DayIndex = d.DayIndex,
            Date = d.Date,
            DayOfMonth = d.DayOfMonth,
            HasCheckIn = d.HasCheckIn,
            Quadrant = d.Quadrant,
            Label = d.Label,
        }).ToList(),
        CheckInDays = dto.CheckInDays,
        Distribution = new WeeklyReflectionDistribution
        {
            HIGH_PLEASANT = dto.Distribution.HIGH_PLEASANT,
            LOW_PLEASANT = dto.Distribution.LOW_PLEASANT,
            HIGH_UNPLEASANT = dto.Distribution.HIGH_UNPLEASANT,
            LOW_UNPLEASANT = dto.Distribution.LOW_UNPLEASANT,
        },
        DominantQuadrant = dto.DominantQuadrant,
        DominantCount = dto.DominantCount,
        MemoryCount = dto.MemoryCount,
        MemoryThumbs = dto.MemoryThumbs.Select(m => new WeeklyReflectionMemoryThumb
        {
            Id = m.Id,
            Title = m.Title,
            ThumbnailUrl = m.ThumbnailUrl,
            CreatedByName = m.CreatedByName,
            MemoryDateTime = m.MemoryDateTime,
        }).ToList(),
        HugsSent = dto.HugsSent,
        HugsReceived = dto.HugsReceived,
        Milestones = dto.Milestones.Select(x => new WeeklyReflectionMilestone
        {
            Id = x.Id,
            Title = x.Title,
            Kind = x.Kind,
            When = x.When,
            Source = x.Source,
        }).ToList(),
        IsEmpty = dto.IsEmpty,
    };

    private static WeeklyReflectionSnapshotDto ToDto(WeeklyReflectionSnapshot s) => new()
    {
        Days = s.Days.Select(d => new WeeklyReflectionDayDto
        {
            DayIndex = d.DayIndex,
            Date = d.Date,
            DayOfMonth = d.DayOfMonth,
            HasCheckIn = d.HasCheckIn,
            Quadrant = d.Quadrant,
            Label = d.Label,
        }).ToList(),
        CheckInDays = s.CheckInDays,
        Distribution = new WeeklyReflectionDistributionDto
        {
            HIGH_PLEASANT = s.Distribution.HIGH_PLEASANT,
            LOW_PLEASANT = s.Distribution.LOW_PLEASANT,
            HIGH_UNPLEASANT = s.Distribution.HIGH_UNPLEASANT,
            LOW_UNPLEASANT = s.Distribution.LOW_UNPLEASANT,
        },
        DominantQuadrant = s.DominantQuadrant,
        DominantCount = s.DominantCount,
        MemoryCount = s.MemoryCount,
        MemoryThumbs = s.MemoryThumbs.Select(m => new WeeklyReflectionMemoryThumbDto
        {
            Id = m.Id,
            Title = m.Title,
            ThumbnailUrl = m.ThumbnailUrl,
            CreatedByName = m.CreatedByName,
            MemoryDateTime = m.MemoryDateTime,
        }).ToList(),
        HugsSent = s.HugsSent,
        HugsReceived = s.HugsReceived,
        Milestones = s.Milestones.Select(x => new WeeklyReflectionMilestoneDto
        {
            Id = x.Id,
            Title = x.Title,
            Kind = x.Kind,
            When = x.When,
            Source = x.Source,
        }).ToList(),
        IsEmpty = s.IsEmpty,
    };
}
