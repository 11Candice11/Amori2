using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Amori.Api.Features.Auth.DTOs;
using Amori.Api.Features.Relationships.DTOs;
using Amori.Api.Features.VisionBoard.DTOs;
using Xunit;

namespace Amori.Api.Tests;

/// <summary>
/// The "Us" Vision Board is shared with the whole relationship: both partners can
/// read AND modify every item and section. These tests pin down that sharing
/// rule, the default-section seeding, the full item/section lifecycle
/// (create/edit/move/reorder/pin/complete/uncomplete/delete), completion notes
/// and the Achieved separation, createdByUserId ownership labelling, media
/// attachment via the shared upload endpoint, and access control for unlinked /
/// cross-relationship / unauthenticated callers.
/// </summary>
public sealed class VisionBoardControllerTests(AmoriWebApplicationFactory factory)
    : IClassFixture<AmoriWebApplicationFactory>, IAsyncLifetime
{
    public async Task InitializeAsync() => await factory.EnsureDatabaseCreatedAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    // ── Empty board + seeding ──────────────────────────────────────────────────

    [Fact]
    public async Task GetBoard_ForANewCouple_SeedsTheDefaultSectionsAndHasNoItems()
    {
        var couple = await CreateLinkedCoupleAsync();

        var board = await GetBoardAsync(couple.PartnerA);

        var sections = board.GetProperty("sections").EnumerateArray().ToList();
        Assert.Equal(6, sections.Count);
        Assert.Contains(sections, s => s.GetProperty("name").GetString() == "Our Dreams");
        Assert.Contains(sections, s => s.GetProperty("name").GetString() == "Our Little Things");
        Assert.All(sections, s => Assert.True(s.GetProperty("isDefault").GetBoolean()));

        Assert.Empty(board.GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task GetBoard_SeedsDefaultsOnlyOnce()
    {
        var couple = await CreateLinkedCoupleAsync();

        var first = await GetBoardAsync(couple.PartnerA);
        // The partner opening it separately must see the same seeded shelves, not a second set.
        var second = await GetBoardAsync(couple.PartnerB);

        Assert.Equal(6, first.GetProperty("sections").GetArrayLength());
        Assert.Equal(6, second.GetProperty("sections").GetArrayLength());
    }

    // ── Linked vs unlinked access ──────────────────────────────────────────────

    [Fact]
    public async Task GetBoard_WhenNotInARelationship_Returns404()
    {
        var loner = await RegisterClientAsync($"vb-loner-{Guid.NewGuid()}@example.com");

        var response = await loner.GetAsync("/api/vision-board");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreateItem_WhenNotInARelationship_Returns404()
    {
        var loner = await RegisterClientAsync($"vb-loner2-{Guid.NewGuid()}@example.com");

        var response = await loner.PostAsync("/api/vision-board/items",
            Json(new CreateVisionBoardItemRequest { Title = "Solo dream" }));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetBoard_WithoutAuth_Returns401()
    {
        var anonymous = factory.CreateClient();

        var response = await anonymous.GetAsync("/api/vision-board");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Create each item type + custom ─────────────────────────────────────────

    [Theory]
    [InlineData("Dream")]
    [InlineData("Place")]
    [InlineData("Experience")]
    [InlineData("Home")]
    [InlineData("Future")]
    [InlineData("LittleThing")]
    [InlineData("Custom")]
    public async Task CreateItem_ForEachType_Succeeds(string type)
    {
        var couple = await CreateLinkedCoupleAsync();

        var response = await couple.PartnerA.PostAsync("/api/vision-board/items",
            JsonRaw($$"""{ "title": "A {{type}} vision", "type": "{{type}}" }"""));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await ReadJsonAsync(response);
        Assert.Equal(type, item.GetProperty("type").GetString());
    }

    [Fact]
    public async Task CreateItem_WithoutTitle_Returns422()
    {
        var couple = await CreateLinkedCoupleAsync();

        var response = await couple.PartnerA.PostAsync("/api/vision-board/items",
            Json(new CreateVisionBoardItemRequest { Title = "  " }));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task CreateItem_WithoutSection_LandsInTheMatchingDefaultShelf()
    {
        var couple = await CreateLinkedCoupleAsync();
        var board = await GetBoardAsync(couple.PartnerA);
        var placesSectionId = board.GetProperty("sections").EnumerateArray()
            .First(s => s.GetProperty("name").GetString() == "Our Places")
            .GetProperty("id").GetGuid();

        var item = await ReadJsonAsync(await couple.PartnerA.PostAsync("/api/vision-board/items",
            Json(new CreateVisionBoardItemRequest { Title = "Hike the Path of the Gods", Type = Amori.Api.Domain.Enums.VisionBoardItemType.Place })));

        Assert.Equal(placesSectionId, item.GetProperty("sectionId").GetGuid());
    }

    // ── createdByUserId ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateItem_StampsTheCreatorSoTheUiCanLabelOwnership()
    {
        var couple = await CreateLinkedCoupleAsync();
        var meId = await MeIdAsync(couple.PartnerA);

        var item = await CreateItemAsync(couple.PartnerA, "Learn to sail together");

        Assert.Equal(meId, item.GetProperty("createdByUserId").GetGuid());
        Assert.False(string.IsNullOrWhiteSpace(item.GetProperty("createdByName").GetString()));
    }

    // ── Partner visibility + shared editing ─────────────────────────────────────

    [Fact]
    public async Task Item_CreatedByOnePartner_IsVisibleToTheOther()
    {
        var couple = await CreateLinkedCoupleAsync();
        var item = await CreateItemAsync(couple.PartnerA, "A sunlit kitchen");
        var itemId = item.GetProperty("id").GetGuid();

        var response = await couple.PartnerB.GetAsync($"/api/vision-board/items/{itemId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Item_CanBeEditedByEitherPartner_NoCreatorOnlyGate()
    {
        var couple = await CreateLinkedCoupleAsync();
        var item = await CreateItemAsync(couple.PartnerA, "Walled herb garden");
        var itemId = item.GetProperty("id").GetGuid();

        var edited = await couple.PartnerB.PatchAsync($"/api/vision-board/items/{itemId}",
            Json(new UpdateVisionBoardItemRequest { Title = "Walled herb garden & lemon trees" }));

        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        var current = await ReadItemAsync(couple.PartnerA, itemId);
        Assert.Equal("Walled herb garden & lemon trees", current.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Item_CanBeDeletedByThePartnerWhoDidNotCreateIt()
    {
        var couple = await CreateLinkedCoupleAsync();
        var item = await CreateItemAsync(couple.PartnerA, "Snowy Christmas in Tromsø");
        var itemId = item.GetProperty("id").GetGuid();

        var deleted = await couple.PartnerB.DeleteAsync($"/api/vision-board/items/{itemId}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        var gone = await couple.PartnerA.GetAsync($"/api/vision-board/items/{itemId}");
        Assert.Equal(HttpStatusCode.NotFound, gone.StatusCode);
    }

    // ── Cross-relationship isolation ────────────────────────────────────────────

    [Fact]
    public async Task GetItem_FromAnotherRelationship_Returns401()
    {
        var couple = await CreateLinkedCoupleAsync();
        var outsiders = await CreateLinkedCoupleAsync();
        var foreignItem = await CreateItemAsync(outsiders.PartnerA, "Not your vision");
        var foreignId = foreignItem.GetProperty("id").GetGuid();

        var response = await couple.PartnerA.GetAsync($"/api/vision-board/items/{foreignId}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Edit ────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateItem_PersistsRichFields()
    {
        var couple = await CreateLinkedCoupleAsync();
        var item = await CreateItemAsync(couple.PartnerA, "See the Northern Lights");
        var itemId = item.GetProperty("id").GetGuid();

        var response = await couple.PartnerA.PatchAsync($"/api/vision-board/items/{itemId}",
            Json(new UpdateVisionBoardItemRequest
            {
                Description = "Under the aurora, wrapped in a wool blanket.",
                LocationName = "Tromsø, Norway",
                Budget = 3200m,
                ExternalReference = "https://visitnorway.com/aurora",
                Notes = "Best odds Nov–Feb.",
            }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var current = await ReadItemAsync(couple.PartnerA, itemId);
        Assert.Equal("Tromsø, Norway", current.GetProperty("locationName").GetString());
        Assert.Equal(3200m, current.GetProperty("budget").GetDecimal());
    }

    // ── Pin / unpin + ordering ──────────────────────────────────────────────────

    [Fact]
    public async Task PinnedItems_FloatToTheTopOfTheBoard()
    {
        var couple = await CreateLinkedCoupleAsync();
        await CreateItemAsync(couple.PartnerA, "First");
        var second = await CreateItemAsync(couple.PartnerA, "Second");
        var secondId = second.GetProperty("id").GetGuid();

        var pinned = await couple.PartnerA.PostAsync($"/api/vision-board/items/{secondId}/pin",
            Json(new PinVisionBoardItemRequest { IsPinned = true }));
        Assert.Equal(HttpStatusCode.OK, pinned.StatusCode);

        var board = await GetBoardAsync(couple.PartnerA);
        var items = board.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal("Second", items[0].GetProperty("title").GetString());
        Assert.True(items[0].GetProperty("isPinned").GetBoolean());
    }

    [Fact]
    public async Task Unpin_ClearsThePinnedFlag()
    {
        var couple = await CreateLinkedCoupleAsync();
        var item = await CreateItemAsync(couple.PartnerA, "Pinned then unpinned");
        var itemId = item.GetProperty("id").GetGuid();

        await couple.PartnerA.PostAsync($"/api/vision-board/items/{itemId}/pin",
            Json(new PinVisionBoardItemRequest { IsPinned = true }));
        var response = await couple.PartnerA.PostAsync($"/api/vision-board/items/{itemId}/pin",
            Json(new PinVisionBoardItemRequest { IsPinned = false }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False((await ReadItemAsync(couple.PartnerA, itemId)).GetProperty("isPinned").GetBoolean());
    }

    [Fact]
    public async Task ReorderItems_AppliesTheRequestedOrder()
    {
        var couple = await CreateLinkedCoupleAsync();
        var a = (await CreateItemAsync(couple.PartnerA, "Alpha")).GetProperty("id").GetGuid();
        var b = (await CreateItemAsync(couple.PartnerA, "Bravo")).GetProperty("id").GetGuid();
        var c = (await CreateItemAsync(couple.PartnerA, "Charlie")).GetProperty("id").GetGuid();

        var response = await couple.PartnerA.PostAsync("/api/vision-board/items/reorder",
            Json(new ReorderVisionBoardItemsRequest { ItemIds = [c, a, b] }));
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var board = await GetBoardAsync(couple.PartnerA);
        var titles = board.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("title").GetString()).ToList();
        Assert.Equal(new[] { "Charlie", "Alpha", "Bravo" }, titles);
    }

    // ── Move ────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task MoveItem_ChangesItsSection()
    {
        var couple = await CreateLinkedCoupleAsync();
        var board = await GetBoardAsync(couple.PartnerA);
        var homeId = board.GetProperty("sections").EnumerateArray()
            .First(s => s.GetProperty("name").GetString() == "Our Home").GetProperty("id").GetGuid();

        var item = await CreateItemAsync(couple.PartnerA, "Golden retriever puppy");
        var itemId = item.GetProperty("id").GetGuid();

        var moved = await couple.PartnerA.PostAsync($"/api/vision-board/items/{itemId}/move",
            Json(new MoveVisionBoardItemRequest { SectionId = homeId }));
        Assert.Equal(HttpStatusCode.OK, moved.StatusCode);

        Assert.Equal(homeId, (await ReadItemAsync(couple.PartnerA, itemId)).GetProperty("sectionId").GetGuid());
    }

    [Fact]
    public async Task MoveItem_ToAForeignSection_Returns401()
    {
        var couple = await CreateLinkedCoupleAsync();
        var outsiders = await CreateLinkedCoupleAsync();
        var foreignBoard = await GetBoardAsync(outsiders.PartnerA);
        var foreignSectionId = foreignBoard.GetProperty("sections").EnumerateArray()
            .First().GetProperty("id").GetGuid();

        var item = await CreateItemAsync(couple.PartnerA, "Trying to escape");
        var itemId = item.GetProperty("id").GetGuid();

        var response = await couple.PartnerA.PostAsync($"/api/vision-board/items/{itemId}/move",
            Json(new MoveVisionBoardItemRequest { SectionId = foreignSectionId }));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Complete / uncomplete + notes ───────────────────────────────────────────

    [Fact]
    public async Task CompleteItem_SetsCompletedAndStoresTheNote()
    {
        var couple = await CreateLinkedCoupleAsync();
        var item = await CreateItemAsync(couple.PartnerA, "Night stargazing in Cederberg");
        var itemId = item.GetProperty("id").GetGuid();

        var completed = await couple.PartnerA.PostAsync($"/api/vision-board/items/{itemId}/complete",
            Json(new CompleteVisionBoardItemRequest { CompletedNote = "We packed the wool blanket and hot cocoa." }));
        Assert.Equal(HttpStatusCode.OK, completed.StatusCode);

        var current = await ReadItemAsync(couple.PartnerA, itemId);
        Assert.True(current.GetProperty("isCompleted").GetBoolean());
        Assert.False(current.GetProperty("completedAt").ValueKind == JsonValueKind.Null);
        Assert.Equal("We packed the wool blanket and hot cocoa.", current.GetProperty("completedNote").GetString());
    }

    [Fact]
    public async Task CompleteItem_WithoutABody_StillCompletes()
    {
        var couple = await CreateLinkedCoupleAsync();
        var item = await CreateItemAsync(couple.PartnerA, "First homemade sourdough");
        var itemId = item.GetProperty("id").GetGuid();

        var completed = await couple.PartnerA.PostAsync($"/api/vision-board/items/{itemId}/complete",
            new StringContent("", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.OK, completed.StatusCode);
        Assert.True((await ReadItemAsync(couple.PartnerA, itemId)).GetProperty("isCompleted").GetBoolean());
    }

    [Fact]
    public async Task UncompleteItem_ClearsCompletionAndNote()
    {
        var couple = await CreateLinkedCoupleAsync();
        var item = await CreateItemAsync(couple.PartnerA, "Weekend cabin getaway");
        var itemId = item.GetProperty("id").GetGuid();

        await couple.PartnerA.PostAsync($"/api/vision-board/items/{itemId}/complete",
            Json(new CompleteVisionBoardItemRequest { CompletedNote = "48 hours unplugged." }));
        var uncompleted = await couple.PartnerA.PostAsync($"/api/vision-board/items/{itemId}/uncomplete", null);
        Assert.Equal(HttpStatusCode.OK, uncompleted.StatusCode);

        var current = await ReadItemAsync(couple.PartnerA, itemId);
        Assert.False(current.GetProperty("isCompleted").GetBoolean());
        Assert.Equal(JsonValueKind.Null, current.GetProperty("completedAt").ValueKind);
        Assert.Equal(JsonValueKind.Null, current.GetProperty("completedNote").ValueKind);
    }

    // ── Media attachment (shared upload endpoint) ───────────────────────────────

    [Fact]
    public async Task UploadImage_ThenAttachToItem_ResolvesAnImageUrl()
    {
        var couple = await CreateLinkedCoupleAsync();
        var fileKey = await UploadTinyPngAsync(couple.PartnerA);

        var item = await ReadJsonAsync(await couple.PartnerA.PostAsync("/api/vision-board/items",
            Json(new CreateVisionBoardItemRequest { Title = "A vision with a photo", ImageFileKey = fileKey })));

        Assert.Equal(fileKey, item.GetProperty("imageFileKey").GetString());
        Assert.False(string.IsNullOrWhiteSpace(item.GetProperty("imageUrl").GetString()));
    }

    [Fact]
    public async Task UploadImage_WithNoFile_IsRejected()
    {
        var couple = await CreateLinkedCoupleAsync();

        // An empty multipart body carries no "file" field, so the request is
        // rejected before the domain runs. Either way it's a client error the UI
        // surfaces as an upload failure the user can retry — never a success.
        using var form = new MultipartFormDataContent();
        var response = await couple.PartnerA.PostAsync("/api/media", form);

        Assert.True(
            response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.UnprocessableEntity,
            $"Expected a 4xx client error, got {(int)response.StatusCode}.");
    }

    [Fact]
    public async Task UploadImage_WithDisallowedContentType_Returns422()
    {
        var couple = await CreateLinkedCoupleAsync();

        using var form = new MultipartFormDataContent();
        var bytes = new ByteArrayContent(Encoding.UTF8.GetBytes("this is not an image"));
        bytes.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(bytes, "file", "notes.pdf");

        var response = await couple.PartnerA.PostAsync("/api/media", form);

        // The MediaController rejects non image/audio/video content types with a
        // ValidationException → 422, which is what the client surfaces as an
        // upload failure the user can retry.
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    // ── Sections: create / custom / edit / reorder / delete ─────────────────────

    [Fact]
    public async Task CreateCustomSection_SortsAfterTheDefaults()
    {
        var couple = await CreateLinkedCoupleAsync();

        var section = await ReadJsonAsync(await couple.PartnerA.PostAsync("/api/vision-board/sections",
            Json(new CreateVisionBoardSectionRequest { Name = "Our Wild Ideas", Description = "The far-fetched ones." })));

        Assert.False(section.GetProperty("isDefault").GetBoolean());
        Assert.Equal("Our Wild Ideas", section.GetProperty("name").GetString());

        var sections = (await GetSectionsAsync(couple.PartnerA)).EnumerateArray().ToList();
        Assert.Equal("Our Wild Ideas", sections.Last().GetProperty("name").GetString());
    }

    [Fact]
    public async Task UpdateSection_RenamesIt()
    {
        var couple = await CreateLinkedCoupleAsync();
        var section = await ReadJsonAsync(await couple.PartnerA.PostAsync("/api/vision-board/sections",
            Json(new CreateVisionBoardSectionRequest { Name = "Temp name" })));
        var sectionId = section.GetProperty("id").GetGuid();

        var response = await couple.PartnerB.PatchAsync($"/api/vision-board/sections/{sectionId}",
            Json(new UpdateVisionBoardSectionRequest { Name = "Our Adventures" }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var sections = (await GetSectionsAsync(couple.PartnerA)).EnumerateArray().ToList();
        Assert.Contains(sections, s => s.GetProperty("name").GetString() == "Our Adventures");
    }

    [Fact]
    public async Task ReorderSections_AppliesTheRequestedOrder()
    {
        var couple = await CreateLinkedCoupleAsync();
        var sections = (await GetSectionsAsync(couple.PartnerA)).EnumerateArray()
            .Select(s => s.GetProperty("id").GetGuid()).ToList();

        var reversed = sections.AsEnumerable().Reverse().ToList();
        var response = await couple.PartnerA.PostAsync("/api/vision-board/sections/reorder",
            Json(new ReorderVisionBoardSectionsRequest { SectionIds = reversed }));
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var afterIds = (await GetSectionsAsync(couple.PartnerA)).EnumerateArray()
            .Select(s => s.GetProperty("id").GetGuid()).ToList();
        Assert.Equal(reversed, afterIds);
    }

    [Fact]
    public async Task DeleteSection_RelocatesItsItemsIntoAnotherSection()
    {
        var couple = await CreateLinkedCoupleAsync();
        var custom = await ReadJsonAsync(await couple.PartnerA.PostAsync("/api/vision-board/sections",
            Json(new CreateVisionBoardSectionRequest { Name = "Doomed shelf" })));
        var sectionId = custom.GetProperty("id").GetGuid();

        var item = await ReadJsonAsync(await couple.PartnerA.PostAsync("/api/vision-board/items",
            Json(new CreateVisionBoardItemRequest { Title = "Survivor item", SectionId = sectionId })));
        var itemId = item.GetProperty("id").GetGuid();

        var deleted = await couple.PartnerA.DeleteAsync($"/api/vision-board/sections/{sectionId}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        // The item survives, moved to a surviving shelf.
        var current = await ReadItemAsync(couple.PartnerA, itemId);
        Assert.NotEqual(sectionId, current.GetProperty("sectionId").GetGuid());

        // The deleted shelf is gone from the section list.
        var sections = (await GetSectionsAsync(couple.PartnerA)).EnumerateArray().ToList();
        Assert.DoesNotContain(sections, s => s.GetProperty("id").GetGuid() == sectionId);
    }

    [Fact]
    public async Task DeleteSection_FromAnotherRelationship_Returns401()
    {
        var couple = await CreateLinkedCoupleAsync();
        var outsiders = await CreateLinkedCoupleAsync();
        var foreignSectionId = (await GetSectionsAsync(outsiders.PartnerA)).EnumerateArray()
            .First().GetProperty("id").GetGuid();

        var response = await couple.PartnerA.DeleteAsync($"/api/vision-board/sections/{foreignSectionId}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Unlinking behaviour ─────────────────────────────────────────────────────

    [Fact]
    public async Task AfterUnlinking_TheSharedItemsStayWithThePartnerWhoRemains()
    {
        var couple = await CreateLinkedCoupleAsync();
        var item = await CreateItemAsync(couple.PartnerA, "Shared while linked");
        var itemId = item.GetProperty("id").GetGuid();

        // PartnerB leaves the relationship. Unlink returns the caller to a fresh
        // solo relationship; the shared relationship and its data stay with A.
        var unlink = await couple.PartnerB.DeleteAsync("/api/partner-link");
        Assert.Equal(HttpStatusCode.NoContent, unlink.StatusCode);

        // The item lives on for the partner who remained.
        var stillThere = await couple.PartnerA.GetAsync($"/api/vision-board/items/{itemId}");
        Assert.Equal(HttpStatusCode.OK, stillThere.StatusCode);

        // The one who left now has a brand-new empty solo board and can no longer
        // reach the previously-shared item.
        var soloBoard = await GetBoardAsync(couple.PartnerB);
        Assert.Empty(soloBoard.GetProperty("items").EnumerateArray());

        var reachForOld = await couple.PartnerB.GetAsync($"/api/vision-board/items/{itemId}");
        Assert.Equal(HttpStatusCode.Unauthorized, reachForOld.StatusCode);
    }

    // ── Duplicate submissions ───────────────────────────────────────────────────

    [Fact]
    public async Task CreateItem_TwiceWithTheSameTitle_CreatesTwoDistinctItems()
    {
        // The server does not dedupe; the client guards against double-taps while a
        // request is in flight. Two deliberate creates should yield two rows so the
        // couple can genuinely list the same wish twice if they choose.
        var couple = await CreateLinkedCoupleAsync();

        var first = await CreateItemAsync(couple.PartnerA, "Sunday morning book club");
        var second = await CreateItemAsync(couple.PartnerA, "Sunday morning book club");

        Assert.NotEqual(first.GetProperty("id").GetGuid(), second.GetProperty("id").GetGuid());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private sealed record Couple(HttpClient PartnerA, HttpClient PartnerB);

    private async Task<Couple> CreateLinkedCoupleAsync()
    {
        var inviterEmail = $"vb-a-{Guid.NewGuid()}@example.com";
        var accepterEmail = $"vb-b-{Guid.NewGuid()}@example.com";

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

    private static async Task<JsonElement> CreateItemAsync(HttpClient client, string title)
    {
        var response = await client.PostAsync("/api/vision-board/items",
            Json(new CreateVisionBoardItemRequest { Title = title }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await ReadJsonAsync(response);
    }

    private static async Task<JsonElement> ReadItemAsync(HttpClient client, Guid itemId)
    {
        var response = await client.GetAsync($"/api/vision-board/items/{itemId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await ReadJsonAsync(response);
    }

    private static async Task<JsonElement> GetBoardAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/vision-board");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await ReadJsonAsync(response);
    }

    private static async Task<JsonElement> GetSectionsAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/vision-board/sections");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await ReadJsonAsync(response);
    }

    private static async Task<Guid> MeIdAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/users/me");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await ReadJsonAsync(response)).GetProperty("id").GetGuid();
    }

    /// <summary>Uploads a 1x1 PNG via the shared media endpoint and returns its file key.</summary>
    private static async Task<string> UploadTinyPngAsync(HttpClient client)
    {
        // Minimal valid 1x1 transparent PNG.
        var png = Convert.FromBase64String(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");

        using var form = new MultipartFormDataContent();
        var content = new ByteArrayContent(png);
        content.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(content, "file", "tiny.png");

        var response = await client.PostAsync("/api/media", form);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await ReadJsonAsync(response)).GetProperty("fileKey").GetString()!;
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.Clone();
    }

    private static StringContent Json<T>(T value) =>
        new(JsonSerializer.Serialize(value), Encoding.UTF8, "application/json");

    private static StringContent JsonRaw(string json) =>
        new(json, Encoding.UTF8, "application/json");
}
