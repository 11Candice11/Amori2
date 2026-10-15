namespace Amori.Api.Features.Users.Services;

/// <summary>
/// The unlock rule for every catalogue badge, so the server can check a badge
/// has really been earned before it is saved to someone's vault.
///
/// Only the rules live here. Names, descriptions, art and tiers stay in the
/// app's registry (src/constants/badges.ts), which owns how a badge looks.
///
/// KEEP IN SYNC with ALL_BADGES in src/constants/badges.ts: same slugs, same
/// categories, same criteria and thresholds. A badge missing here can't be
/// saved to the vault (404); a threshold that differs means the app and server
/// disagree about whether it's earned (409 on save).
/// </summary>
public static class BadgeCatalog
{
    /// <summary>One catalogue badge's unlock rule.</summary>
    public sealed record Entry(string Slug, string Category, string Criteria, int Threshold);

    /// <summary>
    /// The meta criteria "earned a badge in N categories". Not a stats counter:
    /// it's derived from the other badges here.
    /// </summary>
    public const string CategoriesUnlockedCriteria = "categories_unlocked";

    /// <summary>Categories that count towards Eternal Bond — every one except its own.</summary>
    private const string SpecialCategory = "special";

    private static readonly string[] Categories =
    [
        "hugs", "checkins", "memory_vault", "messages", "timeline", "vision_board",
        "bucket_list", "games", "partner_sync", "mood", "media", SpecialCategory, "progression",
    ];

    private static readonly int CountedCategoryTotal = Categories.Count(c => c != SpecialCategory);

    public static readonly IReadOnlyList<Entry> All =
    [
        // Hugs
        new("first_embrace", "hugs", "hugs_sent", 10),
        new("first_embrace2", "hugs", "hugs_sent", 50),
        new("hug_collector", "hugs", "hugs_sent", 100),
        new("golden_heart", "hugs", "hugs_sent", 250),
        new("golden_heart2", "hugs", "hugs_sent", 500),
        new("hug_back", "hugs", "hug_replies_fast", 10),
        new("hug_marathon", "hugs", "hug_streak_days", 7),
        new("long_distance_hugger", "hugs", "long_distance_hugs", 1),
        new("midnight_hug", "hugs", "night_hugs", 1),
        new("both_ways", "hugs", "mutual_hug_days", 10),

        // Check-ins
        new("first_light", "checkins", "morning_checkins", 1),
        new("morning_ritual", "checkins", "morning_checkins", 10),
        new("night_whispers", "checkins", "evening_checkins", 10),
        new("daily_streak", "checkins", "checkin_streak", 7),
        new("daily_streak2", "checkins", "checkin_streak", 30),
        new("evergreen", "checkins", "checkin_streak", 100),
        new("evergreen2", "checkins", "checkin_streak", 250),
        new("evergreen3", "checkins", "checkin_streak", 365),

        // Memory vault
        new("memory_keeper", "memory_vault", "memories_saved_to_vault", 1),

        // Messages
        new("words_that_matter", "messages", "conversations_completed", 1),
        new("words_that_matter2", "messages", "conversations_completed", 10),

        // Timeline
        new("shared_horizons", "timeline", "timeline_events_added", 1),
        new("shared_horizons2", "timeline", "timeline_events_added", 10),
        new("together_forever", "timeline", "anniversary_reached", 1),

        // Vision board
        new("dream_builders", "vision_board", "vision_board_items_added", 10),
        new("dream_builders2", "vision_board", "vision_board_items_achieved", 1),

        // Bucket list
        new("bucket_list_buddy", "bucket_list", "bucket_list_items_completed", 1),
        new("bucket_list_buddy2", "bucket_list", "bucket_list_items_completed", 10),

        // Games
        new("curious_mind", "games", "games_played", 1),
        new("curious_mind2", "games", "partner_quiz_perfect_scores", 1),

        // Partner sync
        new("growing_together", "partner_sync", "sync_questions_agreed", 10),
        new("open_heart", "partner_sync", "partner_request_fast_responses", 10),
        new("safe_harbor", "partner_sync", "partner_low_mood_support", 1),

        // Mood
        new("finding_calm", "mood", "mood_streak_days", 7),
        new("finding_calm2", "mood", "distinct_moods_logged", 5),

        // Media
        new("emerald_soul", "media", "media_shared", 10),
        new("emerald_soul2", "media", "media_shared", 100),

        // Special
        new("sacred_vow", SpecialCategory, "memory_saved_on_anniversary", 1),
        new("eternal_bond", SpecialCategory, CategoriesUnlockedCriteria, CountedCategoryTotal),

        // Progression
        new("level_up", "progression", "level_reached", 5),
    ];

    private static readonly Dictionary<string, Entry> BySlug =
        All.ToDictionary(e => e.Slug, StringComparer.Ordinal);

    /// <summary>The badge with this slug, or null if there isn't one.</summary>
    public static Entry? Find(string slug) => BySlug.GetValueOrDefault(slug);

    /// <summary>
    /// Has the badge been earned, given the user's progress counters from
    /// <see cref="IBadgeStatsService"/>? Criteria the server doesn't track are
    /// absent from the stats and so never count as earned.
    /// </summary>
    public static bool IsUnlocked(Entry badge, IReadOnlyDictionary<string, int> stats)
    {
        var value = badge.Criteria == CategoriesUnlockedCriteria
            ? CountUnlockedCategories(stats)
            : stats.GetValueOrDefault(badge.Criteria);

        return value >= badge.Threshold;
    }

    /// <summary>
    /// Categories (other than Special) with at least one earned badge. Mirrors
    /// countUnlockedCategories in the app's badgeService.
    /// </summary>
    private static int CountUnlockedCategories(IReadOnlyDictionary<string, int> stats) =>
        All.Where(b => b.Criteria != CategoriesUnlockedCriteria && b.Category != SpecialCategory)
           .Where(b => stats.GetValueOrDefault(b.Criteria) >= b.Threshold)
           .Select(b => b.Category)
           .Distinct()
           .Count();
}
