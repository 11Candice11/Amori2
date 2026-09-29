using Amori.Api.Common.Exceptions;
using Amori.Api.Data.Context;
using Amori.Api.Domain.Enums;
using Amori.Api.Domain.ValueObjects;
using Amori.Api.Features.Notifications;
using Amori.Api.Features.Notifications.Services;
using Amori.Api.Features.SupportProfile.DTOs;
using Amori.Api.Infrastructure.Relationships;
using Microsoft.EntityFrameworkCore;
using Entity = Amori.Api.Domain.Entities.SupportProfile;

namespace Amori.Api.Features.SupportProfile.Services;

public sealed class SupportProfileService(
    AmoriDbContext db,
    IRelationshipAccessService relAccess,
    INotificationService notifications) : ISupportProfileService
{
    // ── Reads ────────────────────────────────────────────────────────────────

    public async Task<SupportProfileResponse> GetMineAsync(Guid userId, CancellationToken ct = default)
    {
        var profile = await LoadOrCreateAsync(userId, ct);
        return MapOwner(profile);
    }

    public async Task<PartnerSupportProfileResponse> GetPartnerAsync(Guid userId, CancellationToken ct = default)
    {
        var partner = await relAccess.GetPartnerAsync(userId)
            ?? throw new NotFoundException("You don't have a linked partner yet.");

        var profile = await db.SupportProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == partner.Id, ct);

        // No profile yet → an all-empty partner view ("They haven't shared this yet"
        // for every section). The client renders empty sections, not an error.
        if (profile is null)
        {
            return new PartnerSupportProfileResponse
            {
                UserId = partner.Id,
                PartnerName = partner.DisplayName,
            };
        }

        return MapPartner(profile, partner.DisplayName);
    }

    // ── Writes ───────────────────────────────────────────────────────────────

    public async Task<SupportProfileResponse> UpdateMineAsync(Guid userId, UpdateSupportProfileRequest request, CancellationToken ct = default)
    {
        var profile = await LoadOrCreateAsync(userId, ct, track: true);

        if (request.WhoIAm is not null) ApplyWhoIAm(profile.WhoIAm, request.WhoIAm);
        if (request.WhatILike is not null) ApplyWhatILike(profile.WhatILike, request.WhatILike);
        if (request.Favorites is not null) ApplyFavorites(profile.Favorites, request.Favorites);
        if (request.HowToHelpMe is not null) ApplyHowToHelpMe(profile.HowToHelpMe, request.HowToHelpMe);
        if (request.ThingsToKnow is not null) ApplyThingsToKnow(profile.ThingsToKnow, request.ThingsToKnow);
        if (request.Boundaries is not null) ApplyBoundaries(profile.Boundaries, request.Boundaries);
        if (request.LittleThings is not null) ApplyLittleThings(profile.LittleThings, request.LittleThings);

        await SaveSectionsAsync(profile, ct);
        return MapOwner(profile);
    }

    public async Task<SupportProfileResponse> UpdateWhoIAmAsync(Guid userId, UpdateWhoIAmRequest request, CancellationToken ct = default)
    {
        var profile = await LoadOrCreateAsync(userId, ct, track: true);
        ApplyWhoIAm(profile.WhoIAm, request);
        await SaveSectionsAsync(profile, ct);
        return MapOwner(profile);
    }

    public async Task<SupportProfileResponse> UpdateWhatILikeAsync(Guid userId, UpdateWhatILikeRequest request, CancellationToken ct = default)
    {
        var profile = await LoadOrCreateAsync(userId, ct, track: true);
        ApplyWhatILike(profile.WhatILike, request);
        await SaveSectionsAsync(profile, ct);
        return MapOwner(profile);
    }

    public async Task<SupportProfileResponse> UpdateFavoritesAsync(Guid userId, UpdateFavoritesRequest request, CancellationToken ct = default)
    {
        var profile = await LoadOrCreateAsync(userId, ct, track: true);
        ApplyFavorites(profile.Favorites, request);
        await SaveSectionsAsync(profile, ct);
        return MapOwner(profile);
    }

    public async Task<SupportProfileResponse> UpdateHowToHelpMeAsync(Guid userId, UpdateHowToHelpMeRequest request, CancellationToken ct = default)
    {
        var profile = await LoadOrCreateAsync(userId, ct, track: true);
        ApplyHowToHelpMe(profile.HowToHelpMe, request);
        await SaveSectionsAsync(profile, ct);
        return MapOwner(profile);
    }

    public async Task<SupportProfileResponse> UpdateThingsToKnowAsync(Guid userId, UpdateThingsToKnowRequest request, CancellationToken ct = default)
    {
        var profile = await LoadOrCreateAsync(userId, ct, track: true);
        ApplyThingsToKnow(profile.ThingsToKnow, request);
        await SaveSectionsAsync(profile, ct);
        return MapOwner(profile);
    }

    public async Task<SupportProfileResponse> UpdateBoundariesAsync(Guid userId, UpdateBoundariesRequest request, CancellationToken ct = default)
    {
        var profile = await LoadOrCreateAsync(userId, ct, track: true);
        ApplyBoundaries(profile.Boundaries, request);
        await SaveSectionsAsync(profile, ct);
        return MapOwner(profile);
    }

    public async Task<SupportProfileResponse> UpdateLittleThingsAsync(Guid userId, UpdateLittleThingsRequest request, CancellationToken ct = default)
    {
        var profile = await LoadOrCreateAsync(userId, ct, track: true);
        ApplyLittleThings(profile.LittleThings, request);
        await SaveSectionsAsync(profile, ct);
        return MapOwner(profile);
    }

    public async Task NotifyPartnerAsync(Guid userId, NotifyPartnerRequest request, CancellationToken ct = default)
    {
        var me = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User", userId);
        var partner = await relAccess.GetPartnerAsync(userId)
            ?? throw new NotFoundException("You don't have a linked partner yet.");

        var note = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message!.Trim();
        var body = note is null
            ? $"{me.DisplayName} updated their How to Know Me profile."
            : $"{me.DisplayName} updated their profile: \u201C{note}\u201D";

        // Best-effort in-app + push. Never throws, so a notification hiccup can't
        // fail the user's action. This is the ONLY partner notification the
        // feature sends — field edits themselves never notify.
        await notifications.CreateAsync(
            partner.Id,
            "Your partner updated their profile",
            body,
            notificationType: NotificationTypes.PartnerActivity,
            referenceId: userId.ToString(),
            ct);
    }

    // ── Load / persist ─────────────────────────────────────────────────────────

    private async Task<Entity> LoadOrCreateAsync(Guid userId, CancellationToken ct, bool track = false)
    {
        var query = track ? db.SupportProfiles : db.SupportProfiles.AsNoTracking();
        var profile = await query.FirstOrDefaultAsync(p => p.UserId == userId, ct);
        if (profile is not null)
            return profile;

        profile = new Entity { UserId = userId };
        db.SupportProfiles.Add(profile);
        await db.SaveChangesAsync(ct);
        return profile;
    }

    /// <summary>
    /// Persist section changes. Section values are jsonb columns holding mutated
    /// CLR objects; EF's change detector doesn't see in-place mutations of a
    /// reference-typed property, so we explicitly mark each section modified.
    /// </summary>
    private async Task SaveSectionsAsync(Entity profile, CancellationToken ct)
    {
        var entry = db.Entry(profile);
        entry.Property(p => p.WhoIAm).IsModified = true;
        entry.Property(p => p.WhatILike).IsModified = true;
        entry.Property(p => p.Favorites).IsModified = true;
        entry.Property(p => p.HowToHelpMe).IsModified = true;
        entry.Property(p => p.ThingsToKnow).IsModified = true;
        entry.Property(p => p.Boundaries).IsModified = true;
        entry.Property(p => p.LittleThings).IsModified = true;
        await db.SaveChangesAsync(ct);
    }

    // ── Apply helpers (partial update semantics) ─────────────────────────────────

    private static void ApplyText(ProfileTextField field, TextFieldInput? input)
    {
        if (input is null) return;
        if (input.Value is not null) field.Value = input.Value;
        if (input.Visibility.HasValue) field.Visibility = input.Visibility.Value;
    }

    private static void ApplyList(ProfileListField field, ListFieldInput? input)
    {
        if (input is null) return;
        if (input.Values is not null)
            field.Values = input.Values.Where(v => !string.IsNullOrWhiteSpace(v)).ToList();
        if (input.Visibility.HasValue) field.Visibility = input.Visibility.Value;
    }

    private static void ApplyWhoIAm(WhoIAmSection s, UpdateWhoIAmRequest r)
    {
        ApplyText(s.Nickname, r.Nickname);
        ApplyText(s.SelfDescription, r.SelfDescription);
        ApplyText(s.ImportantToMe, r.ImportantToMe);
        ApplyText(s.WhatMakesMeFeelLikeMyself, r.WhatMakesMeFeelLikeMyself);
        ApplyText(s.WhatImProudOf, r.WhatImProudOf);
        ApplyText(s.WhatImWorkingToward, r.WhatImWorkingToward);
        ApplyText(s.WhatIWishPeopleUnderstood, r.WhatIWishPeopleUnderstood);
    }

    private static void ApplyWhatILike(WhatILikeSection s, UpdateWhatILikeRequest r)
    {
        ApplyList(s.Hobbies, r.Hobbies);
        ApplyList(s.Activities, r.Activities);
        ApplyList(s.DatePreferences, r.DatePreferences);
        ApplyList(s.Music, r.Music);
        ApplyList(s.Movies, r.Movies);
        ApplyList(s.Shows, r.Shows);
        ApplyList(s.Books, r.Books);
        ApplyList(s.Games, r.Games);
        ApplyList(s.Food, r.Food);
        ApplyList(s.Places, r.Places);
    }

    private static void ApplyFavorites(FavoritesSection s, UpdateFavoritesRequest r)
    {
        ApplyText(s.FavoriteColor, r.FavoriteColor);
        if (r.FavoriteColorHex is not null)
        {
            var hex = r.FavoriteColorHex.Value;
            s.FavoriteColorHex = string.IsNullOrWhiteSpace(hex) ? null : hex.Trim();
        }
        ApplyText(s.FavoriteFood, r.FavoriteFood);
        ApplyText(s.FavoriteDrink, r.FavoriteDrink);
        ApplyText(s.FavoriteSnack, r.FavoriteSnack);
        ApplyText(s.FavoriteRestaurant, r.FavoriteRestaurant);
        ApplyText(s.FavoritePlace, r.FavoritePlace);
        ApplyText(s.FavoriteFlower, r.FavoriteFlower);
        ApplyText(s.FavoriteAnimal, r.FavoriteAnimal);
        ApplyText(s.FavoriteMovie, r.FavoriteMovie);
        ApplyText(s.FavoriteSong, r.FavoriteSong);
        ApplyText(s.FavoriteArtist, r.FavoriteArtist);
        ApplyText(s.FavoriteSeason, r.FavoriteSeason);
        ApplyText(s.FavoriteHoliday, r.FavoriteHoliday);
        ApplyText(s.FavoriteSmell, r.FavoriteSmell);
        ApplyText(s.FavoriteActivity, r.FavoriteActivity);
    }

    private static void ApplyHowToHelpMe(HowToHelpMeSection s, UpdateHowToHelpMeRequest r)
    {
        ApplyText(s.WhenHavingDifficultDay, r.WhenHavingDifficultDay);
        ApplyText(s.WhatToAvoid, r.WhatToAvoid);
        ApplyText(s.PreferredReassurance, r.PreferredReassurance);
        ApplyText(s.HowToApproachMe, r.HowToApproachMe);
        ApplyText(s.HowIAskForSpace, r.HowIAskForSpace);
        ApplyText(s.WhatHelpsMeRecover, r.WhatHelpsMeRecover);
        ApplyText(s.NeverAssume, r.NeverAssume);
        if (r.SupportOptions is not null) s.SupportOptions = r.SupportOptions.Distinct().ToList();
        if (r.CustomOptions is not null)
            s.CustomOptions = r.CustomOptions.Where(v => !string.IsNullOrWhiteSpace(v)).ToList();
        if (r.OptionsVisibility.HasValue) s.OptionsVisibility = r.OptionsVisibility.Value;
    }

    private static void ApplyThingsToKnow(ThingsToKnowSection s, UpdateThingsToKnowRequest r)
    {
        ApplyList(s.Stressors, r.Stressors);
        ApplyList(s.Comforts, r.Comforts);
        ApplyList(s.ThingsThatMakeMeFeelAppreciated, r.ThingsThatMakeMeFeelAppreciated);
        ApplyList(s.ThingsThatMakeMeFeelIgnored, r.ThingsThatMakeMeFeelIgnored);
        ApplyList(s.ImportantRoutines, r.ImportantRoutines);
        ApplyList(s.ImportantDates, r.ImportantDates);
        ApplyList(s.Sensitivities, r.Sensitivities);
        ApplyList(s.ThingsToRemember, r.ThingsToRemember);
    }

    private static void ApplyBoundaries(BoundariesSection s, UpdateBoundariesRequest r)
    {
        foreach (var input in r.Categories)
        {
            var entry = s.Categories.FirstOrDefault(c => c.Category == input.Category);
            if (entry is null)
            {
                entry = new BoundaryEntry { Category = input.Category };
                s.Categories.Add(entry);
            }

            if (input.ComfortableWith is not null)
                entry.ComfortableWith = input.ComfortableWith.Where(v => !string.IsNullOrWhiteSpace(v)).ToList();
            if (input.AskBefore is not null)
                entry.AskBefore = input.AskBefore.Where(v => !string.IsNullOrWhiteSpace(v)).ToList();
            if (input.PleaseDont is not null)
                entry.PleaseDont = input.PleaseDont.Where(v => !string.IsNullOrWhiteSpace(v)).ToList();
            if (input.Visibility.HasValue)
                entry.Visibility = input.Visibility.Value;
        }
    }

    private static void ApplyLittleThings(LittleThingsSection s, UpdateLittleThingsRequest r)
    {
        ApplyText(s.UsualCoffeeOrder, r.UsualCoffeeOrder);
        ApplyText(s.ComfortFood, r.ComfortFood);
        ApplyText(s.ComfortMovie, r.ComfortMovie);
        ApplyText(s.WhatMakesMeSmile, r.WhatMakesMeSmile);
        ApplyText(s.GuiltyPleasure, r.GuiltyPleasure);
        ApplyText(s.AlwaysLosing, r.AlwaysLosing);
        ApplyText(s.CouldTalkAboutForever, r.CouldTalkAboutForever);
        ApplyText(s.TinyThingThatMakesMyDay, r.TinyThingThatMakesMyDay);
        ApplyText(s.SecretlyLove, r.SecretlyLove);
    }

    // ── Owner mapping (full, with privacy) ───────────────────────────────────────

    private static TextFieldResponse T(ProfileTextField f) =>
        new() { Value = f.Value, Visibility = f.Visibility };

    private static ListFieldResponse L(ProfileListField f) =>
        new() { Values = f.Values, Visibility = f.Visibility };

    private static SupportProfileResponse MapOwner(Entity p) => new()
    {
        Id = p.Id,
        UserId = p.UserId,
        WhoIAm = new WhoIAmResponse
        {
            Nickname = T(p.WhoIAm.Nickname),
            SelfDescription = T(p.WhoIAm.SelfDescription),
            ImportantToMe = T(p.WhoIAm.ImportantToMe),
            WhatMakesMeFeelLikeMyself = T(p.WhoIAm.WhatMakesMeFeelLikeMyself),
            WhatImProudOf = T(p.WhoIAm.WhatImProudOf),
            WhatImWorkingToward = T(p.WhoIAm.WhatImWorkingToward),
            WhatIWishPeopleUnderstood = T(p.WhoIAm.WhatIWishPeopleUnderstood),
        },
        WhatILike = new WhatILikeResponse
        {
            Hobbies = L(p.WhatILike.Hobbies),
            Activities = L(p.WhatILike.Activities),
            DatePreferences = L(p.WhatILike.DatePreferences),
            Music = L(p.WhatILike.Music),
            Movies = L(p.WhatILike.Movies),
            Shows = L(p.WhatILike.Shows),
            Books = L(p.WhatILike.Books),
            Games = L(p.WhatILike.Games),
            Food = L(p.WhatILike.Food),
            Places = L(p.WhatILike.Places),
        },
        Favorites = new FavoritesResponse
        {
            FavoriteColor = T(p.Favorites.FavoriteColor),
            FavoriteColorHex = p.Favorites.FavoriteColorHex,
            FavoriteFood = T(p.Favorites.FavoriteFood),
            FavoriteDrink = T(p.Favorites.FavoriteDrink),
            FavoriteSnack = T(p.Favorites.FavoriteSnack),
            FavoriteRestaurant = T(p.Favorites.FavoriteRestaurant),
            FavoritePlace = T(p.Favorites.FavoritePlace),
            FavoriteFlower = T(p.Favorites.FavoriteFlower),
            FavoriteAnimal = T(p.Favorites.FavoriteAnimal),
            FavoriteMovie = T(p.Favorites.FavoriteMovie),
            FavoriteSong = T(p.Favorites.FavoriteSong),
            FavoriteArtist = T(p.Favorites.FavoriteArtist),
            FavoriteSeason = T(p.Favorites.FavoriteSeason),
            FavoriteHoliday = T(p.Favorites.FavoriteHoliday),
            FavoriteSmell = T(p.Favorites.FavoriteSmell),
            FavoriteActivity = T(p.Favorites.FavoriteActivity),
        },
        HowToHelpMe = new HowToHelpMeResponse
        {
            WhenHavingDifficultDay = T(p.HowToHelpMe.WhenHavingDifficultDay),
            WhatToAvoid = T(p.HowToHelpMe.WhatToAvoid),
            PreferredReassurance = T(p.HowToHelpMe.PreferredReassurance),
            HowToApproachMe = T(p.HowToHelpMe.HowToApproachMe),
            HowIAskForSpace = T(p.HowToHelpMe.HowIAskForSpace),
            WhatHelpsMeRecover = T(p.HowToHelpMe.WhatHelpsMeRecover),
            NeverAssume = T(p.HowToHelpMe.NeverAssume),
            SupportOptions = p.HowToHelpMe.SupportOptions,
            CustomOptions = p.HowToHelpMe.CustomOptions,
            OptionsVisibility = p.HowToHelpMe.OptionsVisibility,
        },
        ThingsToKnow = new ThingsToKnowResponse
        {
            Stressors = L(p.ThingsToKnow.Stressors),
            Comforts = L(p.ThingsToKnow.Comforts),
            ThingsThatMakeMeFeelAppreciated = L(p.ThingsToKnow.ThingsThatMakeMeFeelAppreciated),
            ThingsThatMakeMeFeelIgnored = L(p.ThingsToKnow.ThingsThatMakeMeFeelIgnored),
            ImportantRoutines = L(p.ThingsToKnow.ImportantRoutines),
            ImportantDates = L(p.ThingsToKnow.ImportantDates),
            Sensitivities = L(p.ThingsToKnow.Sensitivities),
            ThingsToRemember = L(p.ThingsToKnow.ThingsToRemember),
        },
        Boundaries = new BoundariesResponse
        {
            Categories = p.Boundaries.Categories.Select(c => new BoundaryEntryResponse
            {
                Category = c.Category,
                ComfortableWith = c.ComfortableWith,
                AskBefore = c.AskBefore,
                PleaseDont = c.PleaseDont,
                Visibility = c.Visibility,
            }).ToList(),
        },
        LittleThings = new LittleThingsResponse
        {
            UsualCoffeeOrder = T(p.LittleThings.UsualCoffeeOrder),
            ComfortFood = T(p.LittleThings.ComfortFood),
            ComfortMovie = T(p.LittleThings.ComfortMovie),
            WhatMakesMeSmile = T(p.LittleThings.WhatMakesMeSmile),
            GuiltyPleasure = T(p.LittleThings.GuiltyPleasure),
            AlwaysLosing = T(p.LittleThings.AlwaysLosing),
            CouldTalkAboutForever = T(p.LittleThings.CouldTalkAboutForever),
            TinyThingThatMakesMyDay = T(p.LittleThings.TinyThingThatMakesMyDay),
            SecretlyLove = T(p.LittleThings.SecretlyLove),
        },
        Completion = SupportProfileCompletion.Calculate(p),
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt,
    };

    // ── Partner mapping (shared, non-empty fields only) ──────────────────────────
    //
    // This is the privacy boundary. A field is included ONLY when its visibility
    // is Shared AND it has a value. Everything else becomes null / is left out of
    // the list, so a Private field is physically absent from the response — the
    // client never receives it, and cannot leak it.

    /// <summary>The shared text value, or null when private or empty.</summary>
    private static string? Shared(ProfileTextField f) =>
        f.Visibility == FieldVisibility.Shared && f.HasValue ? f.Value : null;

    /// <summary>The shared list, or null when private or empty.</summary>
    private static List<string>? Shared(ProfileListField f) =>
        f.Visibility == FieldVisibility.Shared && f.HasValue
            ? f.Values.Where(v => !string.IsNullOrWhiteSpace(v)).ToList()
            : null;

    private static PartnerSupportProfileResponse MapPartner(Entity p, string partnerName)
    {
        var whoIAm = new PartnerWhoIAmResponse
        {
            Nickname = Shared(p.WhoIAm.Nickname),
            SelfDescription = Shared(p.WhoIAm.SelfDescription),
            ImportantToMe = Shared(p.WhoIAm.ImportantToMe),
            WhatMakesMeFeelLikeMyself = Shared(p.WhoIAm.WhatMakesMeFeelLikeMyself),
            WhatImProudOf = Shared(p.WhoIAm.WhatImProudOf),
            WhatImWorkingToward = Shared(p.WhoIAm.WhatImWorkingToward),
            WhatIWishPeopleUnderstood = Shared(p.WhoIAm.WhatIWishPeopleUnderstood),
        };
        whoIAm = whoIAm with { HasSharedContent = HasAnyText(
            whoIAm.Nickname, whoIAm.SelfDescription, whoIAm.ImportantToMe,
            whoIAm.WhatMakesMeFeelLikeMyself, whoIAm.WhatImProudOf,
            whoIAm.WhatImWorkingToward, whoIAm.WhatIWishPeopleUnderstood) };

        var whatILike = new PartnerWhatILikeResponse
        {
            Hobbies = Shared(p.WhatILike.Hobbies),
            Activities = Shared(p.WhatILike.Activities),
            DatePreferences = Shared(p.WhatILike.DatePreferences),
            Music = Shared(p.WhatILike.Music),
            Movies = Shared(p.WhatILike.Movies),
            Shows = Shared(p.WhatILike.Shows),
            Books = Shared(p.WhatILike.Books),
            Games = Shared(p.WhatILike.Games),
            Food = Shared(p.WhatILike.Food),
            Places = Shared(p.WhatILike.Places),
        };
        whatILike = whatILike with { HasSharedContent = HasAnyList(
            whatILike.Hobbies, whatILike.Activities, whatILike.DatePreferences,
            whatILike.Music, whatILike.Movies, whatILike.Shows, whatILike.Books,
            whatILike.Games, whatILike.Food, whatILike.Places) };

        var favorites = new PartnerFavoritesResponse
        {
            FavoriteColor = Shared(p.Favorites.FavoriteColor),
            // Hex rides along with the colour name's privacy only.
            FavoriteColorHex = p.Favorites.FavoriteColor.Visibility == FieldVisibility.Shared
                ? p.Favorites.FavoriteColorHex : null,
            FavoriteFood = Shared(p.Favorites.FavoriteFood),
            FavoriteDrink = Shared(p.Favorites.FavoriteDrink),
            FavoriteSnack = Shared(p.Favorites.FavoriteSnack),
            FavoriteRestaurant = Shared(p.Favorites.FavoriteRestaurant),
            FavoritePlace = Shared(p.Favorites.FavoritePlace),
            FavoriteFlower = Shared(p.Favorites.FavoriteFlower),
            FavoriteAnimal = Shared(p.Favorites.FavoriteAnimal),
            FavoriteMovie = Shared(p.Favorites.FavoriteMovie),
            FavoriteSong = Shared(p.Favorites.FavoriteSong),
            FavoriteArtist = Shared(p.Favorites.FavoriteArtist),
            FavoriteSeason = Shared(p.Favorites.FavoriteSeason),
            FavoriteHoliday = Shared(p.Favorites.FavoriteHoliday),
            FavoriteSmell = Shared(p.Favorites.FavoriteSmell),
            FavoriteActivity = Shared(p.Favorites.FavoriteActivity),
        };
        favorites = favorites with { HasSharedContent = HasAnyText(
            favorites.FavoriteColor, favorites.FavoriteFood, favorites.FavoriteDrink,
            favorites.FavoriteSnack, favorites.FavoriteRestaurant, favorites.FavoritePlace,
            favorites.FavoriteFlower, favorites.FavoriteAnimal, favorites.FavoriteMovie,
            favorites.FavoriteSong, favorites.FavoriteArtist, favorites.FavoriteSeason,
            favorites.FavoriteHoliday, favorites.FavoriteSmell, favorites.FavoriteActivity) };

        var options = p.HowToHelpMe.OptionsVisibility == FieldVisibility.Shared
            ? p.HowToHelpMe.SupportOptions : null;
        var customOptions = p.HowToHelpMe.OptionsVisibility == FieldVisibility.Shared
            && p.HowToHelpMe.CustomOptions.Any(v => !string.IsNullOrWhiteSpace(v))
                ? p.HowToHelpMe.CustomOptions.Where(v => !string.IsNullOrWhiteSpace(v)).ToList()
                : null;
        var howToHelpMe = new PartnerHowToHelpMeResponse
        {
            WhenHavingDifficultDay = Shared(p.HowToHelpMe.WhenHavingDifficultDay),
            WhatToAvoid = Shared(p.HowToHelpMe.WhatToAvoid),
            PreferredReassurance = Shared(p.HowToHelpMe.PreferredReassurance),
            HowToApproachMe = Shared(p.HowToHelpMe.HowToApproachMe),
            HowIAskForSpace = Shared(p.HowToHelpMe.HowIAskForSpace),
            WhatHelpsMeRecover = Shared(p.HowToHelpMe.WhatHelpsMeRecover),
            NeverAssume = Shared(p.HowToHelpMe.NeverAssume),
            SupportOptions = options is { Count: > 0 } ? options : null,
            CustomOptions = customOptions,
        };
        howToHelpMe = howToHelpMe with { HasSharedContent =
            HasAnyText(howToHelpMe.WhenHavingDifficultDay, howToHelpMe.WhatToAvoid,
                howToHelpMe.PreferredReassurance, howToHelpMe.HowToApproachMe,
                howToHelpMe.HowIAskForSpace, howToHelpMe.WhatHelpsMeRecover,
                howToHelpMe.NeverAssume)
            || howToHelpMe.SupportOptions is { Count: > 0 }
            || howToHelpMe.CustomOptions is { Count: > 0 } };

        var thingsToKnow = new PartnerThingsToKnowResponse
        {
            Stressors = Shared(p.ThingsToKnow.Stressors),
            Comforts = Shared(p.ThingsToKnow.Comforts),
            ThingsThatMakeMeFeelAppreciated = Shared(p.ThingsToKnow.ThingsThatMakeMeFeelAppreciated),
            ThingsThatMakeMeFeelIgnored = Shared(p.ThingsToKnow.ThingsThatMakeMeFeelIgnored),
            ImportantRoutines = Shared(p.ThingsToKnow.ImportantRoutines),
            ImportantDates = Shared(p.ThingsToKnow.ImportantDates),
            Sensitivities = Shared(p.ThingsToKnow.Sensitivities),
            ThingsToRemember = Shared(p.ThingsToKnow.ThingsToRemember),
        };
        thingsToKnow = thingsToKnow with { HasSharedContent = HasAnyList(
            thingsToKnow.Stressors, thingsToKnow.Comforts,
            thingsToKnow.ThingsThatMakeMeFeelAppreciated, thingsToKnow.ThingsThatMakeMeFeelIgnored,
            thingsToKnow.ImportantRoutines, thingsToKnow.ImportantDates,
            thingsToKnow.Sensitivities, thingsToKnow.ThingsToRemember) };

        var sharedCategories = p.Boundaries.Categories
            .Where(c => c.Visibility == FieldVisibility.Shared && c.HasValue)
            .Select(c => new PartnerBoundaryEntryResponse
            {
                Category = c.Category,
                ComfortableWith = c.ComfortableWith.Where(v => !string.IsNullOrWhiteSpace(v)).ToList(),
                AskBefore = c.AskBefore.Where(v => !string.IsNullOrWhiteSpace(v)).ToList(),
                PleaseDont = c.PleaseDont.Where(v => !string.IsNullOrWhiteSpace(v)).ToList(),
            })
            .ToList();
        var boundaries = new PartnerBoundariesResponse
        {
            Categories = sharedCategories,
            HasSharedContent = sharedCategories.Count > 0,
        };

        var littleThings = new PartnerLittleThingsResponse
        {
            UsualCoffeeOrder = Shared(p.LittleThings.UsualCoffeeOrder),
            ComfortFood = Shared(p.LittleThings.ComfortFood),
            ComfortMovie = Shared(p.LittleThings.ComfortMovie),
            WhatMakesMeSmile = Shared(p.LittleThings.WhatMakesMeSmile),
            GuiltyPleasure = Shared(p.LittleThings.GuiltyPleasure),
            AlwaysLosing = Shared(p.LittleThings.AlwaysLosing),
            CouldTalkAboutForever = Shared(p.LittleThings.CouldTalkAboutForever),
            TinyThingThatMakesMyDay = Shared(p.LittleThings.TinyThingThatMakesMyDay),
            SecretlyLove = Shared(p.LittleThings.SecretlyLove),
        };
        littleThings = littleThings with { HasSharedContent = HasAnyText(
            littleThings.UsualCoffeeOrder, littleThings.ComfortFood, littleThings.ComfortMovie,
            littleThings.WhatMakesMeSmile, littleThings.GuiltyPleasure, littleThings.AlwaysLosing,
            littleThings.CouldTalkAboutForever, littleThings.TinyThingThatMakesMyDay,
            littleThings.SecretlyLove) };

        return new PartnerSupportProfileResponse
        {
            UserId = p.UserId,
            PartnerName = partnerName,
            WhoIAm = whoIAm,
            WhatILike = whatILike,
            Favorites = favorites,
            HowToHelpMe = howToHelpMe,
            ThingsToKnow = thingsToKnow,
            Boundaries = boundaries,
            LittleThings = littleThings,
            UpdatedAt = p.UpdatedAt,
        };
    }

    private static bool HasAnyText(params string?[] values) =>
        values.Any(v => !string.IsNullOrWhiteSpace(v));

    private static bool HasAnyList(params List<string>?[] lists) =>
        lists.Any(l => l is { Count: > 0 });
}
