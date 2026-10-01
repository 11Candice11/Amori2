using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Amori.Api.Features.Auth.DTOs;
using Amori.Api.Features.Relationships.DTOs;
using Xunit;

namespace Amori.Api.Tests;

/// <summary>
/// The Support Preferences / "How to Know Me" profile is owner-authored. The
/// owner edits their own profile section by section, each field carrying its own
/// Shared/Private setting; the linked partner gets a read-only projection that
/// contains ONLY shared, non-empty fields. These tests pin down that privacy
/// boundary at the HTTP surface — a Private field must never appear in a partner
/// response — plus partial-update, favorites/color, arrays, custom values,
/// completion, empty/partial profiles, and unauthorized access.
/// </summary>
public sealed class SupportProfileControllerTests(AmoriWebApplicationFactory factory)
    : IClassFixture<AmoriWebApplicationFactory>, IAsyncLifetime
{
    public async Task InitializeAsync() => await factory.EnsureDatabaseCreatedAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    // ── Creation & get-or-create ──────────────────────────────────────────────

    [Fact]
    public async Task GetMine_FirstAccess_CreatesAnEmptyProfile()
    {
        var client = await RegisterClientAsync(Email("create"));

        var response = await client.GetAsync("/api/support-profile/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await ReadJson(response);
        Assert.NotEqual(Guid.Empty, profile.GetProperty("id").GetGuid());
        Assert.Equal(0, profile.GetProperty("completion").GetProperty("percentage").GetInt32());
    }

    [Fact]
    public async Task GetMine_IsStable_ReturnsTheSameProfileEachTime()
    {
        var client = await RegisterClientAsync(Email("stable"));

        var first = await ReadJson(await client.GetAsync("/api/support-profile/me"));
        var second = await ReadJson(await client.GetAsync("/api/support-profile/me"));

        Assert.Equal(
            first.GetProperty("id").GetGuid(),
            second.GetProperty("id").GetGuid());
    }

    // ── Section updates & partial updates ─────────────────────────────────────

    [Fact]
    public async Task UpdateWhoIAm_PersistsValueAndVisibility()
    {
        var client = await RegisterClientAsync(Email("whoiam"));

        var updated = await ReadJson(await client.PatchAsync("/api/support-profile/me/who-i-am",
            Json(new
            {
                nickname = new { value = "Candy", visibility = "Shared" },
                selfDescription = new { value = "Quietly intense", visibility = "Private" },
            })));

        var whoIAm = updated.GetProperty("whoIAm");
        Assert.Equal("Candy", whoIAm.GetProperty("nickname").GetProperty("value").GetString());
        Assert.Equal("Shared", whoIAm.GetProperty("nickname").GetProperty("visibility").GetString());
        Assert.Equal("Private", whoIAm.GetProperty("selfDescription").GetProperty("visibility").GetString());
    }

    [Fact]
    public async Task UpdateWhoIAm_ThenFreshGet_PersistsTheValue()
    {
        // Mirrors the mobile editor's save flow: it PATCHes the WHOLE section with
        // empty strings for untouched fields, then the value must survive a fresh
        // GET /me (a new load, e.g. reopening the screen).
        var client = await RegisterClientAsync(Email("persist"));

        await client.PatchAsync("/api/support-profile/me/who-i-am",
            Json(new
            {
                nickname = new { value = "Persisted", visibility = "Shared" },
                selfDescription = new { value = "", visibility = "Shared" },
                importantToMe = new { value = "", visibility = "Shared" },
                whatMakesMeFeelLikeMyself = new { value = "", visibility = "Shared" },
                whatImProudOf = new { value = "", visibility = "Shared" },
                whatImWorkingToward = new { value = "", visibility = "Shared" },
                whatIWishPeopleUnderstood = new { value = "", visibility = "Shared" },
            }));

        var fresh = await ReadJson(await client.GetAsync("/api/support-profile/me"));

        Assert.Equal("Persisted",
            fresh.GetProperty("whoIAm").GetProperty("nickname").GetProperty("value").GetString());
    }

    [Fact]
    public async Task Update_IsPartial_OmittedFieldsAreUntouched()
    {
        var client = await RegisterClientAsync(Email("partial"));

        // Set two fields.
        await client.PatchAsync("/api/support-profile/me/who-i-am",
            Json(new
            {
                nickname = new { value = "Robin" },
                importantToMe = new { value = "Honesty" },
            }));

        // A second PATCH touching only nickname must leave importantToMe intact.
        var updated = await ReadJson(await client.PatchAsync("/api/support-profile/me/who-i-am",
            Json(new { nickname = new { value = "Rob" } })));

        var whoIAm = updated.GetProperty("whoIAm");
        Assert.Equal("Rob", whoIAm.GetProperty("nickname").GetProperty("value").GetString());
        Assert.Equal("Honesty", whoIAm.GetProperty("importantToMe").GetProperty("value").GetString());
    }

    [Fact]
    public async Task UpdateMine_UpdatesMultipleSectionsAtOnce()
    {
        var client = await RegisterClientAsync(Email("multi"));

        var updated = await ReadJson(await client.PatchAsync("/api/support-profile/me",
            Json(new
            {
                whoIAm = new { nickname = new { value = "Sky" } },
                littleThings = new { usualCoffeeOrder = new { value = "Oat flat white" } },
            })));

        Assert.Equal("Sky",
            updated.GetProperty("whoIAm").GetProperty("nickname").GetProperty("value").GetString());
        Assert.Equal("Oat flat white",
            updated.GetProperty("littleThings").GetProperty("usualCoffeeOrder").GetProperty("value").GetString());
    }

    // ── Favorites & color storage ─────────────────────────────────────────────

    [Fact]
    public async Task UpdateFavorites_StoresFreeFormValuesAndColorHex()
    {
        var client = await RegisterClientAsync(Email("fav"));

        var updated = await ReadJson(await client.PatchAsync("/api/support-profile/me/favorites",
            Json(new
            {
                favoriteColor = new { value = "Sage green" },
                favoriteColorHex = new { value = "#A7B89A" },
                favoriteDrink = new { value = "Oat flat white" },
                favoriteFlower = new { value = "White ranunculus" },
            })));

        var fav = updated.GetProperty("favorites");
        Assert.Equal("Sage green", fav.GetProperty("favoriteColor").GetProperty("value").GetString());
        Assert.Equal("#A7B89A", fav.GetProperty("favoriteColorHex").GetString());
        Assert.Equal("Oat flat white", fav.GetProperty("favoriteDrink").GetProperty("value").GetString());
    }

    // ── Array / list fields & custom values ───────────────────────────────────

    [Fact]
    public async Task UpdateWhatILike_StoresArrays()
    {
        var client = await RegisterClientAsync(Email("like"));

        var updated = await ReadJson(await client.PatchAsync("/api/support-profile/me/what-i-like",
            Json(new
            {
                hobbies = new { values = new[] { "Reading", "Hiking", "Pottery" } },
                music = new { values = new[] { "Jazz" } },
            })));

        var hobbies = updated.GetProperty("whatILike").GetProperty("hobbies").GetProperty("values");
        Assert.Equal(3, hobbies.GetArrayLength());
        Assert.Equal("Reading", hobbies[0].GetString());
    }

    [Fact]
    public async Task UpdateHowToHelpMe_StoresEnumOptionsAndCustomValues()
    {
        var client = await RegisterClientAsync(Email("help"));

        var updated = await ReadJson(await client.PatchAsync("/api/support-profile/me/how-to-help-me",
            Json(new
            {
                supportOptions = new[] { "GiveSpace", "MakeMeLaugh" },
                customOptions = new[] { "Bring me tea" },
                whenHavingDifficultDay = new { value = "I need quiet time first" },
            })));

        var help = updated.GetProperty("howToHelpMe");
        var options = help.GetProperty("supportOptions");
        Assert.Equal(2, options.GetArrayLength());
        Assert.Equal("GiveSpace", options[0].GetString()); // stable identifier, not display text
        Assert.Equal("Bring me tea", help.GetProperty("customOptions")[0].GetString());
    }

    [Fact]
    public async Task UpdateBoundaries_UpsertsByCategoryAndSupportsThreeLists()
    {
        var client = await RegisterClientAsync(Email("bound"));

        await client.PatchAsync("/api/support-profile/me/boundaries",
            Json(new
            {
                categories = new[]
                {
                    new
                    {
                        category = "Communication",
                        comfortableWith = new[] { "Sweet texts through the day" },
                        askBefore = new[] { "Calling during work" },
                        pleaseDont = new[] { "Heavy topics before bed" },
                    },
                },
            }));

        // A second update to a DIFFERENT category must not wipe the first.
        var updated = await ReadJson(await client.PatchAsync("/api/support-profile/me/boundaries",
            Json(new
            {
                categories = new[]
                {
                    new
                    {
                        category = "Privacy",
                        comfortableWith = new[] { "Sharing our wins" },
                        askBefore = Array.Empty<string>(),
                        pleaseDont = Array.Empty<string>(),
                    },
                },
            })));

        var categories = updated.GetProperty("boundaries").GetProperty("categories");
        Assert.Equal(2, categories.GetArrayLength());
    }

    // ── Privacy toggles & partner filtering (the core guarantee) ──────────────

    [Fact]
    public async Task PartnerProfile_ContainsSharedFields()
    {
        var couple = await CreateLinkedCoupleAsync();

        await couple.PartnerA.PatchAsync("/api/support-profile/me/favorites",
            Json(new { favoriteDrink = new { value = "Oat flat white", visibility = "Shared" } }));

        var partnerView = await ReadJson(await couple.PartnerB.GetAsync("/api/support-profile/partner"));

        Assert.Equal("Oat flat white",
            partnerView.GetProperty("favorites").GetProperty("favoriteDrink").GetString());
        Assert.True(partnerView.GetProperty("favorites").GetProperty("hasSharedContent").GetBoolean());
    }

    [Fact]
    public async Task PartnerProfile_NeverContainsPrivateFields()
    {
        var couple = await CreateLinkedCoupleAsync();

        await couple.PartnerA.PatchAsync("/api/support-profile/me/who-i-am",
            Json(new
            {
                nickname = new { value = "PublicName", visibility = "Shared" },
                selfDescription = new { value = "TOP SECRET", visibility = "Private" },
            }));

        var response = await couple.PartnerB.GetAsync("/api/support-profile/partner");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Assert on the raw JSON string: the private value must be physically
        // absent, not just null on a typed model.
        var raw = await response.Content.ReadAsStringAsync();
        Assert.Contains("PublicName", raw);
        Assert.DoesNotContain("TOP SECRET", raw);

        var whoIAm = JsonDocument.Parse(raw).RootElement.GetProperty("whoIAm");
        Assert.Equal("PublicName", whoIAm.GetProperty("nickname").GetString());
        Assert.True(
            whoIAm.GetProperty("selfDescription").ValueKind == JsonValueKind.Null,
            "A Private field must be null in the partner response.");
    }

    [Fact]
    public async Task PartnerProfile_TogglingSharedToPrivate_RemovesItFromPartnerView()
    {
        var couple = await CreateLinkedCoupleAsync();

        // Share, confirm the partner sees it.
        await couple.PartnerA.PatchAsync("/api/support-profile/me/little-things",
            Json(new { comfortFood = new { value = "Sourdough", visibility = "Shared" } }));
        var before = await ReadJson(await couple.PartnerB.GetAsync("/api/support-profile/partner"));
        Assert.Equal("Sourdough",
            before.GetProperty("littleThings").GetProperty("comfortFood").GetString());

        // Flip to Private (value kept), confirm it disappears from the partner view.
        await couple.PartnerA.PatchAsync("/api/support-profile/me/little-things",
            Json(new { comfortFood = new { visibility = "Private" } }));
        var after = await ReadJson(await couple.PartnerB.GetAsync("/api/support-profile/partner"));
        Assert.Equal(JsonValueKind.Null,
            after.GetProperty("littleThings").GetProperty("comfortFood").ValueKind);

        // Owner still sees their own value.
        var owner = await ReadJson(await couple.PartnerA.GetAsync("/api/support-profile/me"));
        Assert.Equal("Sourdough",
            owner.GetProperty("littleThings").GetProperty("comfortFood").GetProperty("value").GetString());
    }

    [Fact]
    public async Task PartnerBoundaries_PrivateCategoryIsExcluded()
    {
        var couple = await CreateLinkedCoupleAsync();

        await couple.PartnerA.PatchAsync("/api/support-profile/me/boundaries",
            Json(new
            {
                categories = new[]
                {
                    new { category = "Communication", comfortableWith = new[] { "Daytime texts" },
                          askBefore = Array.Empty<string>(), pleaseDont = Array.Empty<string>(),
                          visibility = "Shared" },
                    new { category = "Conflict", comfortableWith = new[] { "Secret conflict rule" },
                          askBefore = Array.Empty<string>(), pleaseDont = Array.Empty<string>(),
                          visibility = "Private" },
                },
            }));

        var response = await couple.PartnerB.GetAsync("/api/support-profile/partner");
        var raw = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Secret conflict rule", raw);

        var categories = JsonDocument.Parse(raw).RootElement
            .GetProperty("boundaries").GetProperty("categories");
        Assert.Equal(1, categories.GetArrayLength());
        Assert.Equal("Communication", categories[0].GetProperty("category").GetString());
    }

    // ── Empty & partially completed profiles ──────────────────────────────────

    [Fact]
    public async Task PartnerProfile_WhenNothingShared_ReportsEmptySections()
    {
        var couple = await CreateLinkedCoupleAsync();
        // PartnerA never fills anything in.

        var partnerView = await ReadJson(await couple.PartnerB.GetAsync("/api/support-profile/partner"));

        Assert.False(partnerView.GetProperty("whoIAm").GetProperty("hasSharedContent").GetBoolean());
        Assert.False(partnerView.GetProperty("favorites").GetProperty("hasSharedContent").GetBoolean());
        Assert.False(partnerView.GetProperty("boundaries").GetProperty("hasSharedContent").GetBoolean());
    }

    [Fact]
    public async Task Completion_FiveOfSevenSections_IsRoughlySeventyPercent()
    {
        var client = await RegisterClientAsync(Email("completion"));

        await client.PatchAsync("/api/support-profile/me",
            Json(new
            {
                whoIAm = new { nickname = new { value = "A" } },
                whatILike = new { hobbies = new { values = new[] { "Reading" } } },
                favorites = new { favoriteDrink = new { value = "Tea" } },
                howToHelpMe = new { supportOptions = new[] { "Listen" } },
                thingsToKnow = new { comforts = new { values = new[] { "Blankets" } } },
                // boundaries + littleThings left empty → 5 of 7.
            }));

        var completion = (await ReadJson(await client.GetAsync("/api/support-profile/me")))
            .GetProperty("completion");

        Assert.Equal(5, completion.GetProperty("completedSections").GetInt32());
        Assert.Equal(7, completion.GetProperty("totalSections").GetInt32());
        Assert.Equal(71, completion.GetProperty("percentage").GetInt32());
    }

    [Fact]
    public async Task Completion_PrivateButPopulatedField_StillCounts()
    {
        var client = await RegisterClientAsync(Email("privatecount"));

        await client.PatchAsync("/api/support-profile/me/who-i-am",
            Json(new { nickname = new { value = "Hidden", visibility = "Private" } }));

        var completion = (await ReadJson(await client.GetAsync("/api/support-profile/me")))
            .GetProperty("completion");

        Assert.Equal(1, completion.GetProperty("completedSections").GetInt32());
    }

    // ── Notify partner (explicit only) ─────────────────────────────────────────

    [Fact]
    public async Task NotifyPartner_WhenLinked_Returns204()
    {
        var couple = await CreateLinkedCoupleAsync();

        var response = await couple.PartnerA.PostAsync("/api/support-profile/me/notify-partner",
            Json(new { message = "Added my favorites" }));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task NotifyPartner_WhenNoPartner_Returns404()
    {
        var client = await RegisterClientAsync(Email("nopartner-notify"));

        var response = await client.PostAsync("/api/support-profile/me/notify-partner",
            Json(new { message = "hello?" }));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── Unauthorized / access control ─────────────────────────────────────────

    [Fact]
    public async Task GetMine_WithoutAuth_Returns401()
    {
        var anonymous = factory.CreateClient();

        var response = await anonymous.GetAsync("/api/support-profile/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetPartner_WithNoLinkedPartner_Returns404()
    {
        var client = await RegisterClientAsync(Email("solo"));

        var response = await client.GetAsync("/api/support-profile/partner");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Profiles_AreIsolatedBetweenUnrelatedUsers()
    {
        var alice = await RegisterClientAsync(Email("alice"));
        var bob = await RegisterClientAsync(Email("bob"));

        await alice.PatchAsync("/api/support-profile/me/who-i-am",
            Json(new { nickname = new { value = "AliceOnly", visibility = "Shared" } }));

        // Bob (no relationship with Alice) has his own separate, empty profile and
        // cannot reach Alice's via the partner endpoint.
        var bobOwn = await ReadJson(await bob.GetAsync("/api/support-profile/me"));
        Assert.Equal(JsonValueKind.Null,
            bobOwn.GetProperty("whoIAm").GetProperty("nickname").GetProperty("value").ValueKind);

        var bobPartner = await bob.GetAsync("/api/support-profile/partner");
        Assert.Equal(HttpStatusCode.NotFound, bobPartner.StatusCode);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private sealed record Couple(HttpClient PartnerA, HttpClient PartnerB);

    private static string Email(string tag) => $"sp-{tag}-{Guid.NewGuid()}@example.com";

    private async Task<Couple> CreateLinkedCoupleAsync()
    {
        var inviterEmail = Email("inviter");
        var accepterEmail = Email("accepter");

        var inviter = await RegisterClientAsync(inviterEmail);
        var accepter = await RegisterClientAsync(accepterEmail);

        var relationship = await inviter.PostAsync("/api/relationships",
            Json(new CreateRelationshipRequest { StartDate = new DateOnly(2023, 1, 1) }));
        Assert.Equal(HttpStatusCode.Created, relationship.StatusCode);

        var sent = await inviter.PostAsync("/api/partner-link/requests",
            Json(new SendPartnerLinkRequest { Email = accepterEmail }));
        Assert.Equal(HttpStatusCode.Created, sent.StatusCode);

        var requestId = JsonDocument.Parse(await sent.Content.ReadAsStringAsync())
            .RootElement.GetProperty("id").GetGuid();

        var accepted = await accepter.PostAsync($"/api/partner-link/requests/{requestId}/accept",
            Json(new AcceptPartnerLinkRequest { StartDate = new DateOnly(2023, 1, 1) }));
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);

        return new Couple(inviter, accepter);
    }

    private async Task<HttpClient> RegisterClientAsync(string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsync("/api/auth/register",
            Json(new RegisterRequest { Name = "Test", Email = email, Password = "TestPass123!" }));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = JsonSerializer.Deserialize<AuthResponse>(
            await response.Content.ReadAsStringAsync(),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", body!.AccessToken);
        return client;
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.Clone();
    }

    private static StringContent Json<T>(T value) =>
        new(JsonSerializer.Serialize(value), System.Text.Encoding.UTF8, "application/json");
}
