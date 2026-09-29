using Amori.Api.Domain.ValueObjects;
using Amori.Api.Features.SupportProfile.DTOs;
using Entity = Amori.Api.Domain.Entities.SupportProfile;

namespace Amori.Api.Features.SupportProfile.Services;

/// <summary>
/// Deterministic, side-effect-free completion scoring for a Support Profile.
///
/// Completion is measured at the SECTION level: a section counts as complete
/// when it has at least one meaningfully populated field. The percentage is
/// (completed sections / 7) rounded to the nearest whole percent — so, e.g., a
/// profile with 5 of 7 sections populated reports ~71%. We deliberately do NOT
/// require every field, and a populated-but-Private field still counts (keeping
/// a filled-in answer private is a choice, not incompleteness).
///
/// Pure function of the entity → fully unit-testable with no DB or DI.
/// </summary>
public static class SupportProfileCompletion
{
    public const int TotalSections = 7;

    public static ProfileCompletionResponse Calculate(Entity p)
    {
        var completed = new List<string>();

        if (IsWhoIAmPopulated(p.WhoIAm)) completed.Add("whoIAm");
        if (IsWhatILikePopulated(p.WhatILike)) completed.Add("whatILike");
        if (IsFavoritesPopulated(p.Favorites)) completed.Add("favorites");
        if (IsHowToHelpMePopulated(p.HowToHelpMe)) completed.Add("howToHelpMe");
        if (IsThingsToKnowPopulated(p.ThingsToKnow)) completed.Add("thingsToKnow");
        if (IsBoundariesPopulated(p.Boundaries)) completed.Add("boundaries");
        if (IsLittleThingsPopulated(p.LittleThings)) completed.Add("littleThings");

        var percentage = (int)Math.Round(
            completed.Count * 100.0 / TotalSections,
            MidpointRounding.AwayFromZero);

        return new ProfileCompletionResponse
        {
            Percentage = percentage,
            CompletedSections = completed.Count,
            TotalSections = TotalSections,
            CompletedSectionKeys = completed,
        };
    }

    private static bool IsWhoIAmPopulated(WhoIAmSection s) =>
        s.Nickname.HasValue || s.SelfDescription.HasValue || s.ImportantToMe.HasValue ||
        s.WhatMakesMeFeelLikeMyself.HasValue || s.WhatImProudOf.HasValue ||
        s.WhatImWorkingToward.HasValue || s.WhatIWishPeopleUnderstood.HasValue;

    private static bool IsWhatILikePopulated(WhatILikeSection s) =>
        s.Hobbies.HasValue || s.Activities.HasValue || s.DatePreferences.HasValue ||
        s.Music.HasValue || s.Movies.HasValue || s.Shows.HasValue || s.Books.HasValue ||
        s.Games.HasValue || s.Food.HasValue || s.Places.HasValue;

    private static bool IsFavoritesPopulated(FavoritesSection s) =>
        s.FavoriteColor.HasValue || s.FavoriteFood.HasValue || s.FavoriteDrink.HasValue ||
        s.FavoriteSnack.HasValue || s.FavoriteRestaurant.HasValue || s.FavoritePlace.HasValue ||
        s.FavoriteFlower.HasValue || s.FavoriteAnimal.HasValue || s.FavoriteMovie.HasValue ||
        s.FavoriteSong.HasValue || s.FavoriteArtist.HasValue || s.FavoriteSeason.HasValue ||
        s.FavoriteHoliday.HasValue || s.FavoriteSmell.HasValue || s.FavoriteActivity.HasValue;

    private static bool IsHowToHelpMePopulated(HowToHelpMeSection s) =>
        s.WhenHavingDifficultDay.HasValue || s.WhatToAvoid.HasValue ||
        s.PreferredReassurance.HasValue || s.HowToApproachMe.HasValue ||
        s.HowIAskForSpace.HasValue || s.WhatHelpsMeRecover.HasValue || s.NeverAssume.HasValue ||
        s.SupportOptions.Count > 0 || s.CustomOptions.Any(v => !string.IsNullOrWhiteSpace(v));

    private static bool IsThingsToKnowPopulated(ThingsToKnowSection s) =>
        s.Stressors.HasValue || s.Comforts.HasValue ||
        s.ThingsThatMakeMeFeelAppreciated.HasValue || s.ThingsThatMakeMeFeelIgnored.HasValue ||
        s.ImportantRoutines.HasValue || s.ImportantDates.HasValue ||
        s.Sensitivities.HasValue || s.ThingsToRemember.HasValue;

    private static bool IsBoundariesPopulated(BoundariesSection s) =>
        s.Categories.Any(c => c.HasValue);

    private static bool IsLittleThingsPopulated(LittleThingsSection s) =>
        s.UsualCoffeeOrder.HasValue || s.ComfortFood.HasValue || s.ComfortMovie.HasValue ||
        s.WhatMakesMeSmile.HasValue || s.GuiltyPleasure.HasValue || s.AlwaysLosing.HasValue ||
        s.CouldTalkAboutForever.HasValue || s.TinyThingThatMakesMyDay.HasValue ||
        s.SecretlyLove.HasValue;
}
