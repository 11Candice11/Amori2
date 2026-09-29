using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.SupportProfile.DTOs;

// ─────────────────────────────────────────────────────────────────────────────
// Update requests for the owner's Support Profile.
//
// Every field is nullable so an update is a genuine PATCH: only the fields
// present on the request are applied; anything omitted (null) is left untouched.
// This is what lets each section — and each field within a section — be updated
// independently. A supplied text field replaces both the value and its privacy.
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>A text field update — value and/or its privacy. Omit to leave as-is.</summary>
public sealed class TextFieldInput
{
    /// <summary>New free-form value. Pass an empty string to clear it.</summary>
    public string? Value { get; set; }

    /// <summary>New privacy. Omit to keep the field's current visibility.</summary>
    public FieldVisibility? Visibility { get; set; }
}

/// <summary>A list field update — the full replacement list and/or its privacy.</summary>
public sealed class ListFieldInput
{
    /// <summary>Full replacement list. Pass [] to clear it.</summary>
    public List<string>? Values { get; set; }

    public FieldVisibility? Visibility { get; set; }
}

public sealed class UpdateWhoIAmRequest
{
    public TextFieldInput? Nickname { get; set; }
    public TextFieldInput? SelfDescription { get; set; }
    public TextFieldInput? ImportantToMe { get; set; }
    public TextFieldInput? WhatMakesMeFeelLikeMyself { get; set; }
    public TextFieldInput? WhatImProudOf { get; set; }
    public TextFieldInput? WhatImWorkingToward { get; set; }
    public TextFieldInput? WhatIWishPeopleUnderstood { get; set; }
}

public sealed class UpdateWhatILikeRequest
{
    public ListFieldInput? Hobbies { get; set; }
    public ListFieldInput? Activities { get; set; }
    public ListFieldInput? DatePreferences { get; set; }
    public ListFieldInput? Music { get; set; }
    public ListFieldInput? Movies { get; set; }
    public ListFieldInput? Shows { get; set; }
    public ListFieldInput? Books { get; set; }
    public ListFieldInput? Games { get; set; }
    public ListFieldInput? Food { get; set; }
    public ListFieldInput? Places { get; set; }
}

public sealed class UpdateFavoritesRequest
{
    public TextFieldInput? FavoriteColor { get; set; }

    /// <summary>
    /// A wrapper so we can distinguish "omitted" (leave hex as-is) from
    /// "explicitly cleared". When present, <see cref="ColorHexInput.Value"/>
    /// replaces the stored hex (null/empty clears it).
    /// </summary>
    public ColorHexInput? FavoriteColorHex { get; set; }

    public TextFieldInput? FavoriteFood { get; set; }
    public TextFieldInput? FavoriteDrink { get; set; }
    public TextFieldInput? FavoriteSnack { get; set; }
    public TextFieldInput? FavoriteRestaurant { get; set; }
    public TextFieldInput? FavoritePlace { get; set; }
    public TextFieldInput? FavoriteFlower { get; set; }
    public TextFieldInput? FavoriteAnimal { get; set; }
    public TextFieldInput? FavoriteMovie { get; set; }
    public TextFieldInput? FavoriteSong { get; set; }
    public TextFieldInput? FavoriteArtist { get; set; }
    public TextFieldInput? FavoriteSeason { get; set; }
    public TextFieldInput? FavoriteHoliday { get; set; }
    public TextFieldInput? FavoriteSmell { get; set; }
    public TextFieldInput? FavoriteActivity { get; set; }
}

public sealed class ColorHexInput
{
    public string? Value { get; set; }
}

public sealed class UpdateHowToHelpMeRequest
{
    public TextFieldInput? WhenHavingDifficultDay { get; set; }
    public TextFieldInput? WhatToAvoid { get; set; }
    public TextFieldInput? PreferredReassurance { get; set; }
    public TextFieldInput? HowToApproachMe { get; set; }
    public TextFieldInput? HowIAskForSpace { get; set; }
    public TextFieldInput? WhatHelpsMeRecover { get; set; }
    public TextFieldInput? NeverAssume { get; set; }

    /// <summary>Full replacement of the selected default support options.</summary>
    public List<SupportPreferenceOption>? SupportOptions { get; set; }

    /// <summary>Full replacement of custom (free-form) support options.</summary>
    public List<string>? CustomOptions { get; set; }

    /// <summary>Privacy for the option lists.</summary>
    public FieldVisibility? OptionsVisibility { get; set; }
}

public sealed class UpdateThingsToKnowRequest
{
    public ListFieldInput? Stressors { get; set; }
    public ListFieldInput? Comforts { get; set; }
    public ListFieldInput? ThingsThatMakeMeFeelAppreciated { get; set; }
    public ListFieldInput? ThingsThatMakeMeFeelIgnored { get; set; }
    public ListFieldInput? ImportantRoutines { get; set; }
    public ListFieldInput? ImportantDates { get; set; }
    public ListFieldInput? Sensitivities { get; set; }
    public ListFieldInput? ThingsToRemember { get; set; }
}

/// <summary>Update a single boundary category. Lists omitted (null) are unchanged.</summary>
public sealed class BoundaryCategoryInput
{
    public BoundaryCategory Category { get; set; }
    public List<string>? ComfortableWith { get; set; }
    public List<string>? AskBefore { get; set; }
    public List<string>? PleaseDont { get; set; }
    public FieldVisibility? Visibility { get; set; }
}

/// <summary>
/// Update boundaries. Each entry is upserted by <see cref="BoundaryCategory"/>,
/// so a partial update touching only one category leaves the others intact.
/// </summary>
public sealed class UpdateBoundariesRequest
{
    public List<BoundaryCategoryInput> Categories { get; set; } = [];
}

public sealed class UpdateLittleThingsRequest
{
    public TextFieldInput? UsualCoffeeOrder { get; set; }
    public TextFieldInput? ComfortFood { get; set; }
    public TextFieldInput? ComfortMovie { get; set; }
    public TextFieldInput? WhatMakesMeSmile { get; set; }
    public TextFieldInput? GuiltyPleasure { get; set; }
    public TextFieldInput? AlwaysLosing { get; set; }
    public TextFieldInput? CouldTalkAboutForever { get; set; }
    public TextFieldInput? TinyThingThatMakesMyDay { get; set; }
    public TextFieldInput? SecretlyLove { get; set; }
}

/// <summary>
/// A whole-profile update — every section optional. Used by PATCH
/// /api/support-profile/me to update multiple sections at once. Section-scoped
/// PATCH /me/{section} endpoints reuse the per-section requests above.
/// </summary>
public sealed class UpdateSupportProfileRequest
{
    public UpdateWhoIAmRequest? WhoIAm { get; set; }
    public UpdateWhatILikeRequest? WhatILike { get; set; }
    public UpdateFavoritesRequest? Favorites { get; set; }
    public UpdateHowToHelpMeRequest? HowToHelpMe { get; set; }
    public UpdateThingsToKnowRequest? ThingsToKnow { get; set; }
    public UpdateBoundariesRequest? Boundaries { get; set; }
    public UpdateLittleThingsRequest? LittleThings { get; set; }
}

/// <summary>
/// Body for the explicit "Tell my partner I updated my profile" action. There is
/// no automatic per-field notification — the partner is notified only when the
/// owner deliberately calls this.
/// </summary>
public sealed class NotifyPartnerRequest
{
    /// <summary>Optional short note appended to the notification body.</summary>
    public string? Message { get; set; }
}
