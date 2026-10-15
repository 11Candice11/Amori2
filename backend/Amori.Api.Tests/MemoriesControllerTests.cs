using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Amori.Api.Features.Auth.DTOs;
using Amori.Api.Features.Memories.DTOs;
using Amori.Api.Features.Relationships.DTOs;
using Xunit;

namespace Amori.Api.Tests;

/// <summary>
/// A memory is shared with the whole relationship — both partners can read it —
/// but only the person who created it may edit or delete it. These tests pin
/// that rule down at the API boundary, since the mobile client also hides the
/// Edit/Delete controls for non-creators and must be able to trust the server
/// to enforce it.
/// </summary>
public sealed class MemoriesControllerTests(AmoriWebApplicationFactory factory)
    : IClassFixture<AmoriWebApplicationFactory>, IAsyncLifetime
{
    public async Task InitializeAsync() => await factory.EnsureDatabaseCreatedAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetById_ThePartnerCanSeeAMemoryTheyDidNotCreate()
    {
        var couple = await CreateLinkedCoupleAsync();
        var memoryId = await CreateMemoryAsync(couple.PartnerA, "Our first trip");

        var response = await couple.PartnerB.GetAsync($"/api/memories/{memoryId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Update_AsThePartner_Returns403AndLeavesTheMemoryUnchanged()
    {
        var couple = await CreateLinkedCoupleAsync();
        var memoryId = await CreateMemoryAsync(couple.PartnerA, "First kiss");

        var attempt = await couple.PartnerB.PatchAsync($"/api/memories/{memoryId}",
            Json(new UpdateMemoryRequest { Title = "Edited by the partner" }));
        Assert.Equal(HttpStatusCode.Forbidden, attempt.StatusCode);

        // The title the partner tried to write must not have stuck.
        var current = await ReadMemoryAsync(couple.PartnerA, memoryId);
        Assert.Equal("First kiss", current.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Update_AsTheCreator_Succeeds()
    {
        var couple = await CreateLinkedCoupleAsync();
        var memoryId = await CreateMemoryAsync(couple.PartnerA, "First kiss");

        var response = await couple.PartnerA.PatchAsync($"/api/memories/{memoryId}",
            Json(new UpdateMemoryRequest { Title = "First \"I love you\"" }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var current = await ReadMemoryAsync(couple.PartnerA, memoryId);
        Assert.Equal("First \"I love you\"", current.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Delete_AsThePartner_Returns403AndLeavesTheMemoryInPlace()
    {
        var couple = await CreateLinkedCoupleAsync();
        var memoryId = await CreateMemoryAsync(couple.PartnerA, "Anniversary dinner");

        var attempt = await couple.PartnerB.DeleteAsync($"/api/memories/{memoryId}");
        Assert.Equal(HttpStatusCode.Forbidden, attempt.StatusCode);

        // Still readable by the creator — the soft-delete never happened.
        var stillThere = await couple.PartnerA.GetAsync($"/api/memories/{memoryId}");
        Assert.Equal(HttpStatusCode.OK, stillThere.StatusCode);
    }

    [Fact]
    public async Task Delete_AsTheCreator_SoftDeletesTheMemory()
    {
        var couple = await CreateLinkedCoupleAsync();
        var memoryId = await CreateMemoryAsync(couple.PartnerA, "Beach day");

        var deleted = await couple.PartnerA.DeleteAsync($"/api/memories/{memoryId}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        // Gone for everyone, including the creator.
        var gone = await couple.PartnerA.GetAsync($"/api/memories/{memoryId}");
        Assert.Equal(HttpStatusCode.NotFound, gone.StatusCode);
    }

    [Fact]
    public async Task Update_AMemoryFromAnotherRelationship_Returns403()
    {
        var couple = await CreateLinkedCoupleAsync();
        var outsider = await CreateLinkedCoupleAsync();
        var foreignMemoryId = await CreateMemoryAsync(outsider.PartnerA, "Not your memory");

        var response = await couple.PartnerA.PatchAsync($"/api/memories/{foreignMemoryId}",
            Json(new UpdateMemoryRequest { Title = "Trying to reach across" }));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private sealed record Couple(HttpClient PartnerA, HttpClient PartnerB);

    /// <summary>
    /// Registers two users and links them into a single relationship, returning
    /// an authenticated client for each.
    /// </summary>
    private async Task<Couple> CreateLinkedCoupleAsync()
    {
        var inviterEmail = $"mem-a-{Guid.NewGuid()}@example.com";
        var accepterEmail = $"mem-b-{Guid.NewGuid()}@example.com";

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

    private static async Task<Guid> CreateMemoryAsync(HttpClient client, string title)
    {
        var response = await client.PostAsync("/api/memories",
            Json(new CreateMemoryRequest
            {
                Title = title,
                Description = "Something worth keeping.",
                MemoryDateTime = new DateTime(2024, 6, 1, 12, 0, 0, DateTimeKind.Utc),
                Location = "Techno park"
            }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        return JsonDocument.Parse(await response.Content.ReadAsStringAsync())
            .RootElement.GetProperty("id").GetGuid();
    }

    private static async Task<JsonElement> ReadMemoryAsync(HttpClient client, Guid memoryId)
    {
        var response = await client.GetAsync($"/api/memories/{memoryId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.Clone();
    }

    private static StringContent Json<T>(T value) =>
        new(JsonSerializer.Serialize(value), System.Text.Encoding.UTF8, "application/json");
}
