using Amori.Api.Data.Context;
using Amori.Api.Domain.Entities;
using Amori.Api.Domain.Enums;
using Amori.Api.Infrastructure.Relationships;
using Microsoft.EntityFrameworkCore;

namespace Amori.Api.Features.Users.Services;

/// <summary>
/// Builds the badge progress counters from the user's real activity.
///
/// Badge definitions (names, images, thresholds) live in the client registry;
/// this service only answers "how much of it have they done so far". Every
/// value is derived from existing feature tables, so progress stays correct
/// even for activity recorded before badges existed.
///
/// Criteria we have no data source for (travel-aware hugs, partner mood
/// support, the unbuilt partner-sync feature) are deliberately left out of the
/// dictionary so the client can hide the bar instead of showing a misleading 0.
/// </summary>
public sealed class BadgeStatsService(
    AmoriDbContext db,
    IRelationshipAccessService relationshipAccess) : IBadgeStatsService
{
    /// <summary>A hug reply counts as "fast" within this many minutes.</summary>
    private const int FastHugReplyMinutes = 5;

    /// <summary>An SOS/request response counts as "fast" within this many minutes.</summary>
    private const int FastRequestResponseMinutes = 10;

    /// <summary>A day with at least this many messages counts as a real conversation.</summary>
    private const int ConversationMessageThreshold = 20;

    /// <summary>Hugs sent between these hours (UTC) count as late-night hugs.</summary>
    private const int NightHugFromHour = 0;
    private const int NightHugToHour = 4;

    /// <summary>Reaching out this long after a partner's hard day still counts.</summary>
    private const int SupportWindowHours = 24;

    /// <summary>Moods that mean the partner is having a hard day.</summary>
    private static readonly MoodType[] HardDayMoods =
    [
        MoodType.Anxious,
        MoodType.Sad,
        MoodType.Angry,
        MoodType.Overwhelmed,
        MoodType.Numb,
    ];

    public async Task<Dictionary<string, int>> GetBadgeStatsAsync(Guid userId, CancellationToken ct = default)
    {
        var stats = new Dictionary<string, int>();

        var relationship = await relationshipAccess.GetUserRelationshipAsync(userId);
        var relationshipId = relationship?.Id;

        // Couples who haven't set an anniversary still have one as far as the
        // app is concerned: the day they started out here. Better an honest
        // bar than no bar at all.
        DateOnly? anniversary = relationship is null
            ? null
            : relationship.AnniversaryDate ?? DateOnly.FromDateTime(relationship.CreatedAt);

        await AddPointsStatsAsync(stats, userId, ct);
        await AddHugStatsAsync(stats, userId, ct);
        await AddCheckInStatsAsync(stats, userId, ct);
        await AddMemoryStatsAsync(stats, userId, anniversary, ct);
        await AddMessageStatsAsync(stats, userId, relationshipId, ct);
        await AddTimelineStatsAsync(stats, userId, anniversary, ct);
        await AddPlanningStatsAsync(stats, userId, relationshipId, ct);
        await AddGameStatsAsync(stats, userId, relationshipId, ct);
        await AddSupportStatsAsync(stats, userId, ct);

        return stats;
    }

    // ─── Points & level ──────────────────────────────────────────────────────

    private async Task AddPointsStatsAsync(Dictionary<string, int> stats, Guid userId, CancellationToken ct)
    {
        var points = await db.UserPoints
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => new { p.TotalPoints, p.Level })
            .FirstOrDefaultAsync(ct);

        stats["total_points"] = points?.TotalPoints ?? 0;
        stats["level_reached"] = points?.Level ?? 1;
    }

    // ─── Hugs ────────────────────────────────────────────────────────────────

    private async Task AddHugStatsAsync(Dictionary<string, int> stats, Guid userId, CancellationToken ct)
    {
        // One pass over the user's hugs: streaks and mutual days need the
        // individual timestamps, not just totals.
        var hugs = await db.Hugs
            .AsNoTracking()
            .Where(h => h.SenderId == userId || h.RecipientId == userId)
            .Select(h => new { h.SenderId, h.CreatedAt, h.AcknowledgedAt })
            .ToListAsync(ct);

        var sent = hugs.Where(h => h.SenderId == userId).ToList();
        var received = hugs.Where(h => h.SenderId != userId).ToList();

        stats["hugs_sent"] = sent.Count;

        stats["night_hugs"] = sent.Count(h =>
            h.CreatedAt.Hour >= NightHugFromHour && h.CreatedAt.Hour < NightHugToHour);

        // A hug the user received and acknowledged quickly.
        stats["hug_replies_fast"] = received.Count(h =>
            h.AcknowledgedAt.HasValue &&
            h.AcknowledgedAt.Value - h.CreatedAt <= TimeSpan.FromMinutes(FastHugReplyMinutes));

        stats["hug_streak_days"] = LongestDayStreak(sent.Select(h => h.CreatedAt));

        // Days where hugs went both ways.
        var sentDays = DistinctDays(sent.Select(h => h.CreatedAt));
        var receivedDays = DistinctDays(received.Select(h => h.CreatedAt));
        stats["mutual_hug_days"] = sentDays.Intersect(receivedDays).Count();
    }

    // ─── Check-ins & mood ────────────────────────────────────────────────────

    private async Task AddCheckInStatsAsync(Dictionary<string, int> stats, Guid userId, CancellationToken ct)
    {
        var checkIns = await db.MoodCheckIns
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .Select(m => new { m.CheckInType, m.Mood, m.CreatedAt })
            .ToListAsync(ct);

        var streak = LongestDayStreak(checkIns.Select(c => c.CreatedAt));

        stats["checkins_completed"] = checkIns.Count;
        stats["morning_checkins"] = checkIns.Count(c => c.CheckInType == CheckInType.Morning);
        stats["evening_checkins"] = checkIns.Count(c => c.CheckInType == CheckInType.Evening);
        stats["checkin_streak"] = streak;

        // Mood badges read the same check-in log from a different angle.
        stats["mood_logged"] = checkIns.Count;
        stats["mood_streak_days"] = streak;
        stats["distinct_moods_logged"] = checkIns.Select(c => c.Mood).Distinct().Count();
    }

    // ─── Memories & media ────────────────────────────────────────────────────

    private async Task AddMemoryStatsAsync(
        Dictionary<string, int> stats, Guid userId, DateOnly? anniversary, CancellationToken ct)
    {
        var memories = await db.Memories
            .AsNoTracking()
            .Where(m => m.CreatedByUserId == userId && !m.IsDeleted)
            .Select(m => new { m.MemoryDateTime, m.IsGiftOnly })
            .ToListAsync(ct);

        stats["memories_created"] = memories.Count;

        // Gift-only memories are held back for a reveal, so they aren't in the
        // shared vault yet.
        stats["memories_saved_to_vault"] = memories.Count(m => !m.IsGiftOnly);

        if (anniversary.HasValue)
        {
            stats["memory_saved_on_anniversary"] = memories.Count(m =>
                m.MemoryDateTime.Month == anniversary.Value.Month &&
                m.MemoryDateTime.Day == anniversary.Value.Day);
        }

        var memoryMedia = await db.MemoryMedia
            .AsNoTracking()
            .CountAsync(mm => mm.Memory.CreatedByUserId == userId, ct);

        var mediaMessages = await db.Messages
            .AsNoTracking()
            .CountAsync(m => m.SenderId == userId && !m.IsDeleted &&
                             (m.ImageKey != null || m.VoiceNoteKey != null), ct);

        stats["media_attachments"] = memoryMedia;
        stats["media_shared"] = memoryMedia + mediaMessages;
    }

    // ─── Messages ────────────────────────────────────────────────────────────

    private async Task AddMessageStatsAsync(
        Dictionary<string, int> stats, Guid userId, Guid? relationshipId, CancellationToken ct)
    {
        stats["messages_sent"] = await db.Messages
            .AsNoTracking()
            .CountAsync(m => m.SenderId == userId && !m.IsDeleted, ct);

        if (relationshipId is null) return;

        // "A real conversation" = a day the two of you traded at least
        // ConversationMessageThreshold messages.
        var messageDays = await db.Messages
            .AsNoTracking()
            .Where(m => m.RelationshipId == relationshipId.Value && !m.IsDeleted)
            .Select(m => m.CreatedAt)
            .ToListAsync(ct);

        stats["conversations_completed"] = messageDays
            .GroupBy(timestamp => DateOnly.FromDateTime(timestamp))
            .Count(day => day.Count() >= ConversationMessageThreshold);
    }

    // ─── Timeline & anniversary ──────────────────────────────────────────────

    private async Task AddTimelineStatsAsync(
        Dictionary<string, int> stats, Guid userId, DateOnly? anniversary, CancellationToken ct)
    {
        stats["timeline_events_added"] = await db.TimelineEvents
            .AsNoTracking()
            .CountAsync(t => t.CreatedByUserId == userId, ct);

        if (anniversary.HasValue)
        {
            stats["anniversary_reached"] = CompletedYearsSince(anniversary.Value);
        }
    }

    // ─── Vision board & bucket list ──────────────────────────────────────────

    private async Task AddPlanningStatsAsync(
        Dictionary<string, int> stats, Guid userId, Guid? relationshipId, CancellationToken ct)
    {
        stats["vision_board_items_added"] = await db.VisionBoardItems
            .AsNoTracking()
            .CountAsync(v => v.CreatedByUserId == userId && !v.IsDeleted, ct);

        stats["vision_board_items_achieved"] = await db.VisionBoardItems
            .AsNoTracking()
            .CountAsync(v => v.CreatedByUserId == userId && !v.IsDeleted && v.IsCompleted, ct);

        stats["bucket_list_items_added"] = await db.BucketListItems
            .AsNoTracking()
            .CountAsync(b => b.AddedByUserId == userId, ct);

        // The bucket list is shared, so a completion counts for both partners.
        stats["bucket_list_items_completed"] = relationshipId is null
            ? await db.BucketListItems
                .AsNoTracking()
                .CountAsync(b => b.AddedByUserId == userId && b.IsCompleted, ct)
            : await db.BucketListItems
                .AsNoTracking()
                .CountAsync(b => b.RelationshipId == relationshipId.Value && b.IsCompleted, ct);
    }

    // ─── Games ───────────────────────────────────────────────────────────────

    private async Task AddGameStatsAsync(
        Dictionary<string, int> stats, Guid userId, Guid? relationshipId, CancellationToken ct)
    {
        var quizzesCompleted = await db.QuizSessions
            .AsNoTracking()
            .CountAsync(q => q.UserId == userId && q.CompletedAt != null, ct);

        var perfectQuizzes = await db.QuizSessions
            .AsNoTracking()
            .CountAsync(q => q.UserId == userId && q.CompletedAt != null &&
                             q.TotalQuestions > 0 && q.Score == q.TotalQuestions, ct);

        var distractionGames = await db.GameSessions
            .AsNoTracking()
            .CountAsync(g => g.UserId == userId, ct);

        var wouldYouRather = await db.WouldYouRatherAnswers
            .AsNoTracking()
            .CountAsync(w => w.UserId == userId, ct);

        stats["quizzes_completed"] = quizzesCompleted;
        stats["partner_quiz_perfect_scores"] = perfectQuizzes;
        stats["would_you_rather_answered"] = wouldYouRather;
        stats["games_played"] = quizzesCompleted + distractionGames;

        if (relationshipId is null) return;

        // "In sync" = a Would You Rather question where you both picked the
        // same option. Needs both answers, so it's computed per question.
        var answers = await db.WouldYouRatherAnswers
            .AsNoTracking()
            .Where(a => a.RelationshipId == relationshipId.Value)
            .Select(a => new { a.QuestionId, a.UserId, a.ChoseOptionA })
            .ToListAsync(ct);

        var mine = answers
            .Where(a => a.UserId == userId)
            .GroupBy(a => a.QuestionId)
            .Select(group => group.First());

        stats["sync_questions_agreed"] = mine.Count(ours => answers.Any(theirs =>
            theirs.UserId != userId &&
            theirs.QuestionId == ours.QuestionId &&
            theirs.ChoseOptionA == ours.ChoseOptionA));
    }

    // ─── Support & SOS ───────────────────────────────────────────────────────

    private async Task AddSupportStatsAsync(Dictionary<string, int> stats, Guid userId, CancellationToken ct)
    {
        var requests = await db.EmergencyRequests
            .AsNoTracking()
            .Where(r => r.RecipientId == userId && r.AcknowledgedAt != null)
            .Select(r => new { r.CreatedAt, r.AcknowledgedAt })
            .ToListAsync(ct);

        stats["partner_request_fast_responses"] = requests.Count(r =>
            r.AcknowledgedAt!.Value - r.CreatedAt <= TimeSpan.FromMinutes(FastRequestResponseMinutes));

        var partner = await relationshipAccess.GetPartnerAsync(userId);
        if (partner is null) return;

        // Showing up for a hard day: the partner shared a difficult mood, and
        // the user sent a hug or a message within the day that followed.
        var hardDays = await db.MoodCheckIns
            .AsNoTracking()
            .Where(m => m.UserId == partner.Id &&
                        m.IsSharedWithPartner &&
                        HardDayMoods.Contains(m.Mood))
            .Select(m => m.CreatedAt)
            .ToListAsync(ct);

        if (hardDays.Count == 0)
        {
            stats["partner_low_mood_support"] = 0;
            return;
        }

        var from = hardDays.Min();

        var hugsSent = await db.Hugs
            .AsNoTracking()
            .Where(h => h.SenderId == userId && h.CreatedAt >= from)
            .Select(h => h.CreatedAt)
            .ToListAsync(ct);

        var messagesSent = await db.Messages
            .AsNoTracking()
            .Where(m => m.SenderId == userId && !m.IsDeleted && m.CreatedAt >= from)
            .Select(m => m.CreatedAt)
            .ToListAsync(ct);

        var reachedOutAt = hugsSent.Concat(messagesSent).ToList();
        var window = TimeSpan.FromHours(SupportWindowHours);

        stats["partner_low_mood_support"] = hardDays.Count(hardDay =>
            reachedOutAt.Any(sentAt => sentAt >= hardDay && sentAt - hardDay <= window));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private static HashSet<DateOnly> DistinctDays(IEnumerable<DateTime> timestamps) =>
        timestamps.Select(DateOnly.FromDateTime).ToHashSet();

    /// <summary>
    /// The longest run of consecutive days with at least one entry.
    ///
    /// Longest rather than current, so a badge the user already earned never
    /// looks un-earned after a quiet week.
    /// </summary>
    private static int LongestDayStreak(IEnumerable<DateTime> timestamps)
    {
        var days = DistinctDays(timestamps).OrderBy(day => day).ToList();
        if (days.Count == 0) return 0;

        var longest = 1;
        var run = 1;

        for (var i = 1; i < days.Count; i++)
        {
            run = days[i].DayNumber - days[i - 1].DayNumber == 1 ? run + 1 : 1;
            if (run > longest) longest = run;
        }

        return longest;
    }

    /// <summary>Whole years elapsed since a date, floored at 0.</summary>
    private static int CompletedYearsSince(DateOnly date)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (date > today) return 0;

        var years = today.Year - date.Year;
        if (date.AddYears(years) > today) years--;

        return Math.Max(years, 0);
    }
}
