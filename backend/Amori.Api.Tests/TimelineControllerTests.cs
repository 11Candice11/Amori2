using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Amori.Api.Features.Auth.DTOs;
using Amori.Api.Features.Relationships.DTOs;
using Amori.Api.Features.Timeline.DTOs;
using Xunit;

namespace Amori.Api.Tests;

/// <summary>
/// A timeline milestone is shared with the whole relationship — both partners
/// can read it — but only the person who created it may edit, delete, or change
/// its photos. These tests pin that rule down at the API boundary, mirroring the
/// memories rule, since the mobile client also hides the Edit/Delete controls
/// for non-creators and must be able to trust the server to enforce it. They
/// also cover the photo add/remove flow and the resolved photo URLs.
/// </summary>
public sealed class TimelineControllerTests(AmoriWebApplicationFactory factory)
    : IClassFixture<AmoriWebApplicationFactory>, IAsyncLifetime
{
    public async Task InitializeAsync() => await factory.EnsureDatabaseCreatedAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetById_ThePartnerCanSeeAMilestoneTheyDidNotCreate()
    {
        var couple = await CreateLinkedCoupleAsync();
        var eventId = await CreateEventAsync(couple.PartnerA, "First date");

        var response = await couple.PartnerB.GetAsync($"/api/timeline/{eventId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Update_AsThePartner_Returns401AndLeavesTheMilestoneUnchanged()
    {
        var couple = await CreateLinkedCoupleAsync();
        var eventId = await CreateEventAsync(couple.PartnerA, "First kiss");

        var attempt = await couple.PartnerB.PatchAsync($"/api/timeline/{eventId}",
            Json(new UpdateTimelineEventRequest { Title = "Edited by the partner" }));
        Assert.Equal(HttpStatusCode.Unauthorized, attempt.StatusCode);

        var current = await ReadEventAsync(couple.PartnerA, eventId);
        Assert.Equal("First kiss", current.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Update_AsTheCreator_Succeeds()
    {
        var couple = await CreateLinkedCoupleAsync();
        var eventId = await CreateEventAsync(couple.PartnerA, "First kiss");

        var response = await couple.PartnerA.PatchAsync($"/api/timeline/{eventId}",
            Json(new UpdateTimelineEventRequest { Title = "The night we met" }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var current = await ReadEventAsync(couple.PartnerA, eventId);
        Assert.Equal("The night we met", current.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Delete_AsThePartner_Returns401AndLeavesTheMilestoneInPlace()
    {
        var couple = await CreateLinkedCoupleAsync();
        var eventId = await CreateEventAsync(couple.PartnerA, "Anniversary");

        var attempt = await couple.PartnerB.DeleteAsync($"/api/timeline/{eventId}");
        Assert.Equal(HttpStatusCode.Unauthorized, attempt.StatusCode);

        var stillThere = await couple.PartnerA.GetAsync($"/api/timeline/{eventId}");
        Assert.Equal(HttpStatusCode.OK, stillThere.StatusCode);
    }

    [Fact]
    public async Task Delete_AsTheCreator_RemovesTheMilestone()
    {
        var couple = await CreateLinkedCoupleAsync();
        var eventId = await CreateEventAsync(couple.PartnerA, "First trip");

        var deleted = await couple.PartnerA.DeleteAsync($"/api/timeline/{eventId}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        var gone = await couple.PartnerA.GetAsync($"/api/timeline/{eventId}");
        Assert.Equal(HttpStatusCode.NotFound, gone.StatusCode);
    }

    [Fact]
    public async Task AddMedia_AsThePartner_Returns401()
    {
        var couple = await CreateLinkedCoupleAsync();
        var eventId = await CreateEventAsync(couple.PartnerA, "First conversation");

        var attempt = await couple.PartnerB.PostAsync($"/api/timeline/{eventId}/media",
            Json(new AddTimelineMediaRequest { PhotoKey = "uploads/whatever.jpg" }));

        Assert.Equal(HttpStatusCode.Unauthorized, attempt.StatusCode);
    }

    [Fact]
    public async Task AddMedia_AsTheCreator_AttachesAPhotoWithAResolvedUrl()
    {
        var couple = await CreateLinkedCoupleAsync();
        var eventId = await CreateEventAsync(couple.PartnerA, "Beach day");

        var response = await couple.PartnerA.PostAsync($"/api/timeline/{eventId}/media",
            Json(new AddTimelineMediaRequest { PhotoKey = "photo-key-1.jpg" }));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        var photos = body.GetProperty("photos").EnumerateArray().ToList();
        Assert.Single(photos);
        Assert.Equal("photo-key-1.jpg", photos[0].GetProperty("photoKey").GetString());
        // The response resolves the key to a loadable URL (local storage serves
        // it from /uploads/…), so the client never has to touch raw keys.
        Assert.False(string.IsNullOrWhiteSpace(photos[0].GetProperty("url").GetString()));
    }

    [Fact]
    public async Task RemoveMedia_AsTheCreator_DetachesThePhoto()
    {
        var couple = await CreateLinkedCoupleAsync();
        var eventId = await CreateEventAsync(couple.PartnerA, "Road trip");

        await couple.PartnerA.PostAsync($"/api/timeline/{eventId}/media",
            Json(new AddTimelineMediaRequest { PhotoKey = "key-a.jpg" }));
        await couple.PartnerA.PostAsync($"/api/timeline/{eventId}/media",
            Json(new AddTimelineMediaRequest { PhotoKey = "key-b.jpg" }));

        var removed = await couple.PartnerA.DeleteAsync(
            $"/api/timeline/{eventId}/media?photoKey={Uri.EscapeDataString("key-a.jpg")}");
        Assert.Equal(HttpStatusCode.OK, removed.StatusCode);

        var body = JsonDocument.Parse(await removed.Content.ReadAsStringAsync()).RootElement;
        var keys = body.GetProperty("photoKeys").EnumerateArray().Select(k => k.GetString()).ToList();
        Assert.Equal(new[] { "key-b.jpg" }, keys);
    }

    [Fact]
    public async Task RemoveMedia_AsThePartner_Returns401()
    {
        var couple = await CreateLinkedCoupleAsync();
        var eventId = await CreateEventAsync(couple.PartnerA, "Picnic");
        await couple.PartnerA.PostAsync($"/api/timeline/{eventId}/media",
            Json(new AddTimelineMediaRequest { PhotoKey = "key-x.jpg" }));

        var attempt = await couple.PartnerB.DeleteAsync(
            $"/api/timeline/{eventId}/media?photoKey={Uri.EscapeDataString("key-x.jpg")}");

        Assert.Equal(HttpStatusCode.Unauthorized, attempt.StatusCode);
    }

    [Fact]
    public async Task Create_WithPhotoKeys_ReturnsResolvedPhotos()
    {
        var couple = await CreateLinkedCoupleAsync();

        var response = await couple.PartnerA.PostAsync("/api/timeline",
            Json(new CreateTimelineEventRequest
            {
                Title = "Our first holiday",
                EventDate = new DateOnly(2024, 3, 1),
                PhotoKeys = ["k1.jpg", "k2.jpg"],
            }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal(2, body.GetProperty("photos").GetArrayLength());
    }

    [Fact]
    public async Task Create_WithCoordinates_PersistsLatLongForTappableLocation()
    {
        var couple = await CreateLinkedCoupleAsync();

        var created = await couple.PartnerA.PostAsync("/api/timeline",
            Json(new CreateTimelineEventRequest
            {
                Title = "Where we met",
                EventDate = new DateOnly(2024, 2, 14),
                Location = "The Roast, London",
                Latitude = 51.5081,
                Longitude = -0.0759,
            }));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        var eventId = JsonDocument.Parse(await created.Content.ReadAsStringAsync())
            .RootElement.GetProperty("id").GetGuid();

        // Re-read to confirm the coordinates round-trip through the database.
        var fetched = await ReadEventAsync(couple.PartnerA, eventId);
        Assert.Equal(51.5081, fetched.GetProperty("latitude").GetDouble(), 4);
        Assert.Equal(-0.0759, fetched.GetProperty("longitude").GetDouble(), 4);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private sealed record Couple(HttpClient PartnerA, HttpClient PartnerB);

    private async Task<Couple> CreateLinkedCoupleAsync()
    {
        var inviterEmail = $"tl-a-{Guid.NewGuid()}@example.com";
        var accepterEmail = $"tl-b-{Guid.NewGuid()}@example.com";

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

    private static async Task<Guid> CreateEventAsync(HttpClient client, string title)
    {
        var response = await client.PostAsync("/api/timeline",
            Json(new CreateTimelineEventRequest
            {
                Title = title,
                EventDate = new DateOnly(2024, 6, 1),
                Description = "A moment worth keeping.",
            }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        return JsonDocument.Parse(await response.Content.ReadAsStringAsync())
            .RootElement.GetProperty("id").GetGuid();
    }

    private static async Task<JsonElement> ReadEventAsync(HttpClient client, Guid eventId)
    {
        var response = await client.GetAsync($"/api/timeline/{eventId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.Clone();
    }

    private static StringContent Json<T>(T value) =>
        new(JsonSerializer.Serialize(value), System.Text.Encoding.UTF8, "application/json");
}
