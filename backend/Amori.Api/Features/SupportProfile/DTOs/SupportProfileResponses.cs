using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.SupportProfile.DTOs;

// ─────────────────────────────────────────────────────────────────────────────
// OWNER responses — the full profile, including each field's privacy so the
// owner's editor can render and toggle it.
// ─────────────────────────────────────────────────────────────────────────────

public sealed class TextFieldResponse
{
    public string? Value { get; init; }
    public FieldVisibility Visibility { get; init; }
}

public sealed class ListFieldResponse
{
    public List<string> Values { get; init; } = [];
    public FieldVisibility Visibility { get; init; }
}

public sealed class WhoIAmResponse
{
    public TextFieldResponse Nickname { get; init; } = new();
    public TextFieldResponse SelfDescription { get; init; } = new();
    public TextFieldResponse ImportantToMe { get; init; } = new();
    public TextFieldResponse WhatMakesMeFeelLikeMyself { get; init; } = new();
    public TextFieldResponse WhatImProudOf { get; init; } = new();
    public TextFieldResponse WhatImWorkingToward { get; init; } = new();
    public TextFieldResponse WhatIWishPeopleUnderstood { get; init; } = new();
}

public sealed class WhatILikeResponse
{
    public ListFieldResponse Hobbies { get; init; } = new();
    public ListFieldResponse Activities { get; init; } = new();
    public ListFieldResponse DatePreferences { get; init; } = new();
    public ListFieldResponse Music { get; init; } = new();
    public ListFieldResponse Movies { get; init; } = new();
    public ListFieldResponse Shows { get; init; } = new();
    public ListFieldResponse Books { get; init; } = new();
    public ListFieldResponse Games { get; init; } = new();
    public ListFieldResponse Food { get; init; } = new();
    public ListFieldResponse Places { get; init; } = new();
}

public sealed class FavoritesResponse
{
    public TextFieldResponse FavoriteColor { get; init; } = new();
    public string? FavoriteColorHex { get; init; }
    public TextFieldResponse FavoriteFood { get; init; } = new();
    public TextFieldResponse FavoriteDrink { get; init; } = new();
    public TextFieldResponse FavoriteSnack { get; init; } = new();
    public TextFieldResponse FavoriteRestaurant { get; init; } = new();
    public TextFieldResponse FavoritePlace { get; init; } = new();
    public TextFieldResponse FavoriteFlower { get; init; } = new();
    public TextFieldResponse FavoriteAnimal { get; init; } = new();
    public TextFieldResponse FavoriteMovie { get; init; } = new();
    public TextFieldResponse FavoriteSong { get; init; } = new();
    public TextFieldResponse FavoriteArtist { get; init; } = new();
    public TextFieldResponse FavoriteSeason { get; init; } = new();
    public TextFieldResponse FavoriteHoliday { get; init; } = new();
    public TextFieldResponse FavoriteSmell { get; init; } = new();
    public TextFieldResponse FavoriteActivity { get; init; } = new();
}

public sealed class HowToHelpMeResponse
{
    public TextFieldResponse WhenHavingDifficultDay { get; init; } = new();
    public TextFieldResponse WhatToAvoid { get; init; } = new();
    public TextFieldResponse PreferredReassurance { get; init; } = new();
    public TextFieldResponse HowToApproachMe { get; init; } = new();
    public TextFieldResponse HowIAskForSpace { get; init; } = new();
    public TextFieldResponse WhatHelpsMeRecover { get; init; } = new();
    public TextFieldResponse NeverAssume { get; init; } = new();
    public List<SupportPreferenceOption> SupportOptions { get; init; } = [];
    public List<string> CustomOptions { get; init; } = [];
    public FieldVisibility OptionsVisibility { get; init; }
}

public sealed class ThingsToKnowResponse
{
    public ListFieldResponse Stressors { get; init; } = new();
    public ListFieldResponse Comforts { get; init; } = new();
    public ListFieldResponse ThingsThatMakeMeFeelAppreciated { get; init; } = new();
    public ListFieldResponse ThingsThatMakeMeFeelIgnored { get; init; } = new();
    public ListFieldResponse ImportantRoutines { get; init; } = new();
    public ListFieldResponse ImportantDates { get; init; } = new();
    public ListFieldResponse Sensitivities { get; init; } = new();
    public ListFieldResponse ThingsToRemember { get; init; } = new();
}

public sealed class BoundaryEntryResponse
{
    public BoundaryCategory Category { get; init; }
    public List<string> ComfortableWith { get; init; } = [];
    public List<string> AskBefore { get; init; } = [];
    public List<string> PleaseDont { get; init; } = [];
    public FieldVisibility Visibility { get; init; }
}

public sealed class BoundariesResponse
{
    public List<BoundaryEntryResponse> Categories { get; init; } = [];
}

public sealed class LittleThingsResponse
{
    public TextFieldResponse UsualCoffeeOrder { get; init; } = new();
    public TextFieldResponse ComfortFood { get; init; } = new();
    public TextFieldResponse ComfortMovie { get; init; } = new();
    public TextFieldResponse WhatMakesMeSmile { get; init; } = new();
    public TextFieldResponse GuiltyPleasure { get; init; } = new();
    public TextFieldResponse AlwaysLosing { get; init; } = new();
    public TextFieldResponse CouldTalkAboutForever { get; init; } = new();
    public TextFieldResponse TinyThingThatMakesMyDay { get; init; } = new();
    public TextFieldResponse SecretlyLove { get; init; } = new();
}

/// <summary>
/// The owner's own full profile. Includes every field and its privacy, plus a
/// completion summary. This is what GET/PATCH /api/support-profile/me return.
/// </summary>
public sealed class SupportProfileResponse
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public WhoIAmResponse WhoIAm { get; init; } = new();
    public WhatILikeResponse WhatILike { get; init; } = new();
    public FavoritesResponse Favorites { get; init; } = new();
    public HowToHelpMeResponse HowToHelpMe { get; init; } = new();
    public ThingsToKnowResponse ThingsToKnow { get; init; } = new();
    public BoundariesResponse Boundaries { get; init; } = new();
    public LittleThingsResponse LittleThings { get; init; } = new();
    public ProfileCompletionResponse Completion { get; init; } = new();
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

/// <summary>
/// Deterministic completion summary. <see cref="Percentage"/> is derived from
/// how many of the seven sections contain meaningful populated data (0–100,
/// rounded). Private-but-populated fields still count — choosing to keep a
/// filled-in field private is not the same as leaving it blank.
/// </summary>
public sealed class ProfileCompletionResponse
{
    public int Percentage { get; init; }
    public int CompletedSections { get; init; }
    public int TotalSections { get; init; }

    /// <summary>The section keys that have at least one populated field.</summary>
    public List<string> CompletedSectionKeys { get; init; } = [];
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER responses — a read-only projection containing ONLY fields the owner
// marked Shared AND that have a value. Private and empty fields are physically
// absent (null), so nothing private ever leaves the server. There is no
// Visibility on partner DTOs (everything here is, by definition, shared).
// ─────────────────────────────────────────────────────────────────────────────

public sealed record PartnerWhoIAmResponse
{
    public string? Nickname { get; init; }
    public string? SelfDescription { get; init; }
    public string? ImportantToMe { get; init; }
    public string? WhatMakesMeFeelLikeMyself { get; init; }
    public string? WhatImProudOf { get; init; }
    public string? WhatImWorkingToward { get; init; }
    public string? WhatIWishPeopleUnderstood { get; init; }

    /// <summary>True when at least one shared field has a value.</summary>
    public bool HasSharedContent { get; init; }
}

public sealed record PartnerWhatILikeResponse
{
    public List<string>? Hobbies { get; init; }
    public List<string>? Activities { get; init; }
    public List<string>? DatePreferences { get; init; }
    public List<string>? Music { get; init; }
    public List<string>? Movies { get; init; }
    public List<string>? Shows { get; init; }
    public List<string>? Books { get; init; }
    public List<string>? Games { get; init; }
    public List<string>? Food { get; init; }
    public List<string>? Places { get; init; }
    public bool HasSharedContent { get; init; }
}

public sealed record PartnerFavoritesResponse
{
    public string? FavoriteColor { get; init; }
    public string? FavoriteColorHex { get; init; }
    public string? FavoriteFood { get; init; }
    public string? FavoriteDrink { get; init; }
    public string? FavoriteSnack { get; init; }
    public string? FavoriteRestaurant { get; init; }
    public string? FavoritePlace { get; init; }
    public string? FavoriteFlower { get; init; }
    public string? FavoriteAnimal { get; init; }
    public string? FavoriteMovie { get; init; }
    public string? FavoriteSong { get; init; }
    public string? FavoriteArtist { get; init; }
    public string? FavoriteSeason { get; init; }
    public string? FavoriteHoliday { get; init; }
    public string? FavoriteSmell { get; init; }
    public string? FavoriteActivity { get; init; }
    public bool HasSharedContent { get; init; }
}

public sealed record PartnerHowToHelpMeResponse
{
    public string? WhenHavingDifficultDay { get; init; }
    public string? WhatToAvoid { get; init; }
    public string? PreferredReassurance { get; init; }
    public string? HowToApproachMe { get; init; }
    public string? HowIAskForSpace { get; init; }
    public string? WhatHelpsMeRecover { get; init; }
    public string? NeverAssume { get; init; }
    public List<SupportPreferenceOption>? SupportOptions { get; init; }
    public List<string>? CustomOptions { get; init; }
    public bool HasSharedContent { get; init; }
}

public sealed record PartnerThingsToKnowResponse
{
    public List<string>? Stressors { get; init; }
    public List<string>? Comforts { get; init; }
    public List<string>? ThingsThatMakeMeFeelAppreciated { get; init; }
    public List<string>? ThingsThatMakeMeFeelIgnored { get; init; }
    public List<string>? ImportantRoutines { get; init; }
    public List<string>? ImportantDates { get; init; }
    public List<string>? Sensitivities { get; init; }
    public List<string>? ThingsToRemember { get; init; }
    public bool HasSharedContent { get; init; }
}

public sealed class PartnerBoundaryEntryResponse
{
    public BoundaryCategory Category { get; init; }
    public List<string> ComfortableWith { get; init; } = [];
    public List<string> AskBefore { get; init; } = [];
    public List<string> PleaseDont { get; init; } = [];
}

public sealed record PartnerBoundariesResponse
{
    public List<PartnerBoundaryEntryResponse> Categories { get; init; } = [];
    public bool HasSharedContent { get; init; }
}

public sealed record PartnerLittleThingsResponse
{
    public string? UsualCoffeeOrder { get; init; }
    public string? ComfortFood { get; init; }
    public string? ComfortMovie { get; init; }
    public string? WhatMakesMeSmile { get; init; }
    public string? GuiltyPleasure { get; init; }
    public string? AlwaysLosing { get; init; }
    public string? CouldTalkAboutForever { get; init; }
    public string? TinyThingThatMakesMyDay { get; init; }
    public string? SecretlyLove { get; init; }
    public bool HasSharedContent { get; init; }
}

/// <summary>
/// The read-only partner view. Every section is present but is only populated
/// with shared, non-empty fields; a section with nothing shared has
/// HasSharedContent=false, which the client renders as "They haven't shared this
/// yet." Private and empty fields are simply not here.
/// </summary>
public sealed class PartnerSupportProfileResponse
{
    /// <summary>The owner's user id (the current caller's partner).</summary>
    public Guid UserId { get; init; }
    public string PartnerName { get; init; } = string.Empty;
    public PartnerWhoIAmResponse WhoIAm { get; init; } = new();
    public PartnerWhatILikeResponse WhatILike { get; init; } = new();
    public PartnerFavoritesResponse Favorites { get; init; } = new();
    public PartnerHowToHelpMeResponse HowToHelpMe { get; init; } = new();
    public PartnerThingsToKnowResponse ThingsToKnow { get; init; } = new();
    public PartnerBoundariesResponse Boundaries { get; init; } = new();
    public PartnerLittleThingsResponse LittleThings { get; init; } = new();
    public DateTime? UpdatedAt { get; init; }
}
