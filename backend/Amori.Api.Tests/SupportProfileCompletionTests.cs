using Amori.Api.Domain.Enums;
using Amori.Api.Domain.ValueObjects;
using Amori.Api.Features.SupportProfile.Services;
using Xunit;
using Entity = Amori.Api.Domain.Entities.SupportProfile;

namespace Amori.Api.Tests;

/// <summary>
/// Completion scoring is a pure function of the profile entity, so it's tested
/// directly (no DB, no HTTP). These pin the deterministic percentage mapping and
/// the rule that a populated-but-Private field still counts toward completion.
/// </summary>
public sealed class SupportProfileCompletionTests
{
    [Fact]
    public void EmptyProfile_IsZeroPercent()
    {
        var result = SupportProfileCompletion.Calculate(new Entity());

        Assert.Equal(0, result.Percentage);
        Assert.Equal(0, result.CompletedSections);
        Assert.Equal(7, result.TotalSections);
        Assert.Empty(result.CompletedSectionKeys);
    }

    [Fact]
    public void FiveOfSevenSections_IsSeventyOnePercent()
    {
        var profile = new Entity();
        profile.WhoIAm.Nickname.Value = "A";
        profile.WhatILike.Hobbies.Values.Add("Reading");
        profile.Favorites.FavoriteDrink.Value = "Tea";
        profile.HowToHelpMe.SupportOptions.Add(SupportPreferenceOption.Listen);
        profile.ThingsToKnow.Comforts.Values.Add("Blankets");
        // boundaries + littleThings left empty.

        var result = SupportProfileCompletion.Calculate(profile);

        Assert.Equal(5, result.CompletedSections);
        Assert.Equal(71, result.Percentage); // round(5/7*100) = 71
    }

    [Fact]
    public void AllSevenSections_IsOneHundredPercent()
    {
        var profile = new Entity();
        profile.WhoIAm.Nickname.Value = "A";
        profile.WhatILike.Hobbies.Values.Add("Reading");
        profile.Favorites.FavoriteDrink.Value = "Tea";
        profile.HowToHelpMe.CustomOptions.Add("Bring tea");
        profile.ThingsToKnow.Comforts.Values.Add("Blankets");
        profile.Boundaries.Categories.Add(new BoundaryEntry
        {
            Category = BoundaryCategory.Communication,
            ComfortableWith = ["Texts"],
        });
        profile.LittleThings.UsualCoffeeOrder.Value = "Oat flat white";

        var result = SupportProfileCompletion.Calculate(profile);

        Assert.Equal(7, result.CompletedSections);
        Assert.Equal(100, result.Percentage);
    }

    [Fact]
    public void PrivateButPopulatedField_StillCounts()
    {
        var profile = new Entity();
        profile.WhoIAm.Nickname.Value = "Hidden";
        profile.WhoIAm.Nickname.Visibility = FieldVisibility.Private;

        var result = SupportProfileCompletion.Calculate(profile);

        Assert.Equal(1, result.CompletedSections);
        Assert.Contains("whoIAm", result.CompletedSectionKeys);
    }

    [Fact]
    public void BlankWhitespaceValue_DoesNotCount()
    {
        var profile = new Entity();
        profile.WhoIAm.Nickname.Value = "   ";

        var result = SupportProfileCompletion.Calculate(profile);

        Assert.Equal(0, result.CompletedSections);
    }

    [Fact]
    public void Calculation_IsDeterministic_ForTheSameInput()
    {
        var profile = new Entity();
        profile.Favorites.FavoriteColor.Value = "Gold";

        var a = SupportProfileCompletion.Calculate(profile);
        var b = SupportProfileCompletion.Calculate(profile);

        Assert.Equal(a.Percentage, b.Percentage);
        Assert.Equal(a.CompletedSectionKeys, b.CompletedSectionKeys);
    }
}
