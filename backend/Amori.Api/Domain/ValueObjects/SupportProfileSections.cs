using Amori.Api.Domain.Enums;

namespace Amori.Api.Domain.ValueObjects;

// ─────────────────────────────────────────────────────────────────────────────
// Support Profile section value objects.
//
// The whole profile is stored as a handful of jsonb columns (see
// SupportProfileConfiguration) rather than dozens of tables. Each section is a
// plain CLR object; Npgsql dynamic JSON serializes it into/out of a single
// jsonb column. All members are nullable / default to empty so a section can be
// partially populated and partially updated without ever needing every field.
//
// Privacy lives ON each field. A text field is a ProfileTextField (value +
// visibility); a list field is a ProfileListField (values + visibility). The
// partner projection copies across only the fields whose Visibility is Shared,
// so a Private field is physically absent from a partner response. Boundaries
// carry per-category visibility instead of per-field, matching the UI.
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>A single free-form text field with its own privacy setting.</summary>
public sealed class ProfileTextField
{
    /// <summary>The owner's free-form answer. Null/empty means "not filled in".</summary>
    public string? Value { get; set; }

    /// <summary>Who may see this field. Defaults to Shared.</summary>
    public FieldVisibility Visibility { get; set; } = FieldVisibility.Shared;

    /// <summary>True when the owner has entered a meaningful value.</summary>
    public bool HasValue => !string.IsNullOrWhiteSpace(Value);
}

/// <summary>A list field (multiple free-form entries) with its own privacy.</summary>
public sealed class ProfileListField
{
    public List<string> Values { get; set; } = [];

    public FieldVisibility Visibility { get; set; } = FieldVisibility.Shared;

    /// <summary>True when the list has at least one non-blank entry.</summary>
    public bool HasValue => Values.Any(v => !string.IsNullOrWhiteSpace(v));
}

/// <summary>Section 1 — Who I Am.</summary>
public sealed class WhoIAmSection
{
    public ProfileTextField Nickname { get; set; } = new();
    public ProfileTextField SelfDescription { get; set; } = new();
    public ProfileTextField ImportantToMe { get; set; } = new();
    public ProfileTextField WhatMakesMeFeelLikeMyself { get; set; } = new();
    public ProfileTextField WhatImProudOf { get; set; } = new();
    public ProfileTextField WhatImWorkingToward { get; set; } = new();
    public ProfileTextField WhatIWishPeopleUnderstood { get; set; } = new();
}

/// <summary>Section 2 — What I Like (all list fields).</summary>
public sealed class WhatILikeSection
{
    public ProfileListField Hobbies { get; set; } = new();
    public ProfileListField Activities { get; set; } = new();
    public ProfileListField DatePreferences { get; set; } = new();
    public ProfileListField Music { get; set; } = new();
    public ProfileListField Movies { get; set; } = new();
    public ProfileListField Shows { get; set; } = new();
    public ProfileListField Books { get; set; } = new();
    public ProfileListField Games { get; set; } = new();
    public ProfileListField Food { get; set; } = new();
    public ProfileListField Places { get; set; } = new();
}

/// <summary>Section 3 — My Favorites (all free-form text).</summary>
public sealed class FavoritesSection
{
    public ProfileTextField FavoriteColor { get; set; } = new();

    /// <summary>
    /// Optional selected colour value for UI display (e.g. a hex like "#DFBA73")
    /// paired with <see cref="FavoriteColor"/>'s free-form name. Follows the
    /// same privacy as <see cref="FavoriteColor"/> — it is only projected when
    /// FavoriteColor is Shared.
    /// </summary>
    public string? FavoriteColorHex { get; set; }

    public ProfileTextField FavoriteFood { get; set; } = new();
    public ProfileTextField FavoriteDrink { get; set; } = new();
    public ProfileTextField FavoriteSnack { get; set; } = new();
    public ProfileTextField FavoriteRestaurant { get; set; } = new();
    public ProfileTextField FavoritePlace { get; set; } = new();
    public ProfileTextField FavoriteFlower { get; set; } = new();
    public ProfileTextField FavoriteAnimal { get; set; } = new();
    public ProfileTextField FavoriteMovie { get; set; } = new();
    public ProfileTextField FavoriteSong { get; set; } = new();
    public ProfileTextField FavoriteArtist { get; set; } = new();
    public ProfileTextField FavoriteSeason { get; set; } = new();
    public ProfileTextField FavoriteHoliday { get; set; } = new();
    public ProfileTextField FavoriteSmell { get; set; } = new();
    public ProfileTextField FavoriteActivity { get; set; } = new();
}

/// <summary>Section 4 — How to Help Me.</summary>
public sealed class HowToHelpMeSection
{
    public ProfileTextField WhenHavingDifficultDay { get; set; } = new();
    public ProfileTextField WhatToAvoid { get; set; } = new();
    public ProfileTextField PreferredReassurance { get; set; } = new();
    public ProfileTextField HowToApproachMe { get; set; } = new();
    public ProfileTextField HowIAskForSpace { get; set; } = new();
    public ProfileTextField WhatHelpsMeRecover { get; set; } = new();
    public ProfileTextField NeverAssume { get; set; } = new();

    /// <summary>
    /// The owner-selected default support options, stored as stable enum
    /// identifiers (never display text). Empty when none chosen.
    /// </summary>
    public List<SupportPreferenceOption> SupportOptions { get; set; } = [];

    /// <summary>Owner-authored custom support options that aren't in the defaults.</summary>
    public List<string> CustomOptions { get; set; } = [];

    /// <summary>Privacy for the option lists (SupportOptions + CustomOptions).</summary>
    public FieldVisibility OptionsVisibility { get; set; } = FieldVisibility.Shared;
}

/// <summary>Section 5 — Things to Know (all list fields).</summary>
public sealed class ThingsToKnowSection
{
    public ProfileListField Stressors { get; set; } = new();
    public ProfileListField Comforts { get; set; } = new();
    public ProfileListField ThingsThatMakeMeFeelAppreciated { get; set; } = new();
    public ProfileListField ThingsThatMakeMeFeelIgnored { get; set; } = new();
    public ProfileListField ImportantRoutines { get; set; } = new();
    public ProfileListField ImportantDates { get; set; } = new();
    public ProfileListField Sensitivities { get; set; } = new();
    public ProfileListField ThingsToRemember { get; set; } = new();
}

/// <summary>One boundary category — three lists plus its own privacy.</summary>
public sealed class BoundaryEntry
{
    public BoundaryCategory Category { get; set; }
    public List<string> ComfortableWith { get; set; } = [];
    public List<string> AskBefore { get; set; } = [];
    public List<string> PleaseDont { get; set; } = [];
    public FieldVisibility Visibility { get; set; } = FieldVisibility.Shared;

    public bool HasValue =>
        ComfortableWith.Any(v => !string.IsNullOrWhiteSpace(v)) ||
        AskBefore.Any(v => !string.IsNullOrWhiteSpace(v)) ||
        PleaseDont.Any(v => !string.IsNullOrWhiteSpace(v));
}

/// <summary>Section 6 — My Boundaries. A list of category entries.</summary>
public sealed class BoundariesSection
{
    public List<BoundaryEntry> Categories { get; set; } = [];
}

/// <summary>Section 7 — My Little Things (all free-form text).</summary>
public sealed class LittleThingsSection
{
    public ProfileTextField UsualCoffeeOrder { get; set; } = new();
    public ProfileTextField ComfortFood { get; set; } = new();
    public ProfileTextField ComfortMovie { get; set; } = new();
    public ProfileTextField WhatMakesMeSmile { get; set; } = new();
    public ProfileTextField GuiltyPleasure { get; set; } = new();
    public ProfileTextField AlwaysLosing { get; set; } = new();
    public ProfileTextField CouldTalkAboutForever { get; set; } = new();
    public ProfileTextField TinyThingThatMakesMyDay { get; set; } = new();
    public ProfileTextField SecretlyLove { get; set; } = new();
}
