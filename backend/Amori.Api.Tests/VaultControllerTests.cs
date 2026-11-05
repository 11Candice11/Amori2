using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Amori.Api.Features.Auth.DTOs;
using Amori.Api.Features.Memories.DTOs;
using Amori.Api.Features.Relationships.DTOs;
using Amori.Api.Features.Vault.DTOs;
using Xunit;

namespace Amori.Api.Tests;

/// <summary>
/// The Hearth Vault is private per person. These tests pin that down: two
/// partners share a relationship and can both see the same memory, but what
/// each of them *saves* must stay invisible to the other.
///
/// Regression origin: the vault previously lived in a single device-wide
/// AsyncStorage key on the client, so a partner signing into the same install
/// saw the other's saved gifts.
/// </summary>
public sealed class VaultControllerTests(AmoriWebApplicationFactory factory)
    : IClassFixture<AmoriWebApplicationFactory>, IAsyncLifetime
{
    public async Task InitializeAsync() => await factory.EnsureDatabaseCreatedAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetGifts_DoesNotIncludeThePartnersSavedGifts()
    {
        var couple = await CreateLinkedCoupleAsync();
        var memoryId = await CreateMemoryAsync(couple.PartnerA, "Our first trip");

        var saved = await couple.PartnerA.PostAsync("/api/vault/gifts",
            Json(new SaveVaultGiftRequest { MemoryId = memoryId, CardNumber = 3 }));
        Assert.Equal(HttpStatusCode.Created, saved.StatusCode);

        // The saver sees it.
        var mine = await ReadGiftsAsync(couple.PartnerA);
        Assert.Single(mine);
        Assert.Equal("Our first trip", mine[0].GetProperty("title").GetString());
        Assert.Equal(3, mine[0].GetProperty("cardNumber").GetInt32());

        // The partner does not, even though they can see the underlying memory.
        var theirs = await ReadGiftsAsync(couple.PartnerB);
        Assert.Empty(theirs);
    }

    [Fact]
    public async Task GetGiftById_AsThePartner_Returns404()
    {
        var couple = await CreateLinkedCoupleAsync();
        var memoryId = await CreateMemoryAsync(couple.PartnerA, "Picnic");
        var giftId = await SaveGiftAsync(couple.PartnerA, memoryId, cardNumber: 1);

        var response = await couple.PartnerB.GetAsync($"/api/vault/gifts/{giftId}");

        // 404 rather than 403/401 on purpose: a partner shouldn't be able to
        // tell the difference between "not yours" and "doesn't exist".
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task RemoveGift_AsThePartner_Returns404AndLeavesTheGiftInPlace()
    {
        var couple = await CreateLinkedCoupleAsync();
        var memoryId = await CreateMemoryAsync(couple.PartnerA, "Anniversary dinner");
        var giftId = await SaveGiftAsync(couple.PartnerA, memoryId, cardNumber: 7);

        var deleteAttempt = await couple.PartnerB.DeleteAsync($"/api/vault/gifts/{giftId}");
        Assert.Equal(HttpStatusCode.NotFound, deleteAttempt.StatusCode);

        var stillMine = await ReadGiftsAsync(couple.PartnerA);
        Assert.Single(stillMine);
    }

    [Fact]
    public async Task RemoveGift_AsTheOwner_EmptiesTheVault()
    {
        var couple = await CreateLinkedCoupleAsync();
        var memoryId = await CreateMemoryAsync(couple.PartnerA, "Beach day");
        var giftId = await SaveGiftAsync(couple.PartnerA, memoryId, cardNumber: 2);

        var deleted = await couple.PartnerA.DeleteAsync($"/api/vault/gifts/{giftId}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        Assert.Empty(await ReadGiftsAsync(couple.PartnerA));
    }

    [Fact]
    public async Task SaveGift_BothPartnersMaySaveTheSameMemoryIntoTheirOwnVault()
    {
        var couple = await CreateLinkedCoupleAsync();
        var memoryId = await CreateMemoryAsync(couple.PartnerA, "The proposal");

        await SaveGiftAsync(couple.PartnerA, memoryId, cardNumber: 4);
        await SaveGiftAsync(couple.PartnerB, memoryId, cardNumber: 9);

        // Uniqueness is per (user, memory), so each vault holds its own copy
        // — with its own card art.
        var a = await ReadGiftsAsync(couple.PartnerA);
        var b = await ReadGiftsAsync(couple.PartnerB);
        Assert.Single(a);
        Assert.Single(b);
        Assert.Equal(4, a[0].GetProperty("cardNumber").GetInt32());
        Assert.Equal(9, b[0].GetProperty("cardNumber").GetInt32());
        Assert.NotEqual(a[0].GetProperty("id").GetGuid(), b[0].GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task SaveGift_SavingTheSameMemoryTwice_IsIdempotent()
    {
        var couple = await CreateLinkedCoupleAsync();
        var memoryId = await CreateMemoryAsync(couple.PartnerA, "Road trip");

        var first = await SaveGiftAsync(couple.PartnerA, memoryId, cardNumber: 5);
        var second = await SaveGiftAsync(couple.PartnerA, memoryId, cardNumber: 6);

        Assert.Equal(first, second);
        Assert.Single(await ReadGiftsAsync(couple.PartnerA));
    }

    [Fact]
    public async Task SaveGift_WithAMemoryFromAnotherRelationship_Returns403()
    {
        var couple = await CreateLinkedCoupleAsync();
        var outsider = await CreateLinkedCoupleAsync();
        var foreignMemoryId = await CreateMemoryAsync(outsider.PartnerA, "Not your memory");

        var response = await couple.PartnerA.PostAsync("/api/vault/gifts",
            Json(new SaveVaultGiftRequest { MemoryId = foreignMemoryId, CardNumber = 1 }));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(44)]
    [InlineData(-1)]
    public async Task SaveGift_WithACardNumberOutsideTheDeck_Returns422(int cardNumber)
    {
        var couple = await CreateLinkedCoupleAsync();
        var memoryId = await CreateMemoryAsync(couple.PartnerA, "Sunset");

        var response = await couple.PartnerA.PostAsync("/api/vault/gifts",
            Json(new SaveVaultGiftRequest { MemoryId = memoryId, CardNumber = cardNumber }));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task SaveGift_WithAnUnknownMemory_Returns404()
    {
        var couple = await CreateLinkedCoupleAsync();

        var response = await couple.PartnerA.PostAsync("/api/vault/gifts",
            Json(new SaveVaultGiftRequest { MemoryId = Guid.NewGuid(), CardNumber = 1 }));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetGifts_WithoutAuthentication_Returns401()
    {
        using var anonymous = factory.CreateClient();

        var response = await anonymous.GetAsync("/api/vault/gifts");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private sealed record Couple(HttpClient PartnerA, HttpClient PartnerB);

    /// <summary>
    /// Registers two users and links them into a single relationship, returning
    /// an authenticated client for each.
    /// </summary>
    private async Task<Couple> CreateLinkedCoupleAsync()
    {
        var inviterEmail = $"vault-a-{Guid.NewGuid()}@example.com";
        var accepterEmail = $"vault-b-{Guid.NewGuid()}@example.com";

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

    private static async Task<Guid> SaveGiftAsync(HttpClient client, Guid memoryId, int cardNumber)
    {
        var response = await client.PostAsync("/api/vault/gifts",
            Json(new SaveVaultGiftRequest { MemoryId = memoryId, CardNumber = cardNumber }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        return JsonDocument.Parse(await response.Content.ReadAsStringAsync())
            .RootElement.GetProperty("id").GetGuid();
    }

    private static async Task<List<JsonElement>> ReadGiftsAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/vault/gifts");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.EnumerateArray().Select(e => e.Clone()).ToList();
    }

    private static StringContent Json<T>(T value) =>
        new(JsonSerializer.Serialize(value), System.Text.Encoding.UTF8, "application/json");
}
