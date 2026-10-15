using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Amori.Api.Common.Time;
using Amori.Api.Features.Auth.DTOs;
using Xunit;

namespace Amori.Api.Tests;

// TEMPORARY verification for catalogue badge archiving — deleted after the run.
public sealed class TmpBadgeArchiveVerificationTests(AmoriWebApplicationFactory factory)
    : IClassFixture<AmoriWebApplicationFactory>, IAsyncLifetime
{
    private readonly AmoriWebApplicationFactory _factory = factory;
    public async Task InitializeAsync() => await _factory.EnsureDatabaseCreatedAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task UnknownSlug_Is404()
    {
        var c = await NewUserAsync();
        var r = await c.PostAsync("/api/users/me/badges/not_a_badge/archive", null);
        Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
    }

    [Fact]
    public async Task UnearnedBadge_Is409_AndNothingIsSaved()
    {
        var c = await NewUserAsync();
        var r = await c.PostAsync("/api/users/me/badges/first_light/archive", null);
        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Equal(0, await CountBadgesAsync(c));
    }

    [Fact]
    public async Task EarnedBadge_IsSaved_AndSavingTwiceIsIdempotent()
    {
        var c = await NewUserAsync();
        var checkIn = await CheckInAsync(c);
        Assert.Equal(HttpStatusCode.Created, checkIn.StatusCode);

        var first = await c.PostAsync("/api/users/me/badges/first_light/archive", null);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        using var a = JsonDocument.Parse(await first.Content.ReadAsStringAsync());
        Assert.Equal("first_light", a.RootElement.GetProperty("slug").GetString());
        Assert.True(a.RootElement.GetProperty("isArchivedInVault").GetBoolean());

        var second = await c.PostAsync("/api/users/me/badges/first_light/archive", null);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        using var b = JsonDocument.Parse(await second.Content.ReadAsStringAsync());
        Assert.Equal(a.RootElement.GetProperty("id").GetString(), b.RootElement.GetProperty("id").GetString());

        Assert.Equal(1, await CountBadgesAsync(c));
    }

    [Fact]
    public async Task ConcurrentSaves_ProduceOneRow()
    {
        var c = await NewUserAsync();
        await CheckInAsync(c);
        var results = await Task.WhenAll(Enumerable.Range(0, 5)
            .Select(_ => c.PostAsync("/api/users/me/badges/first_light/archive", null)));
        Assert.All(results, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        Assert.Equal(1, await CountBadgesAsync(c));
    }

    [Fact]
    public async Task LevelBadges_StillArchiveById_AndCoexistWithCatalogueBadges()
    {
        var c = await NewUserAsync();
        await CheckInAsync(c);
        var adjust = await c.PostAsJsonAsync("/api/users/me/points",
            new { activityType = "ManualAdjustment", amount = 1500 });
        Assert.Equal(HttpStatusCode.OK, adjust.StatusCode);

        await c.PostAsync("/api/users/me/badges/first_light/archive", null);

        var list = await c.GetAsync("/api/users/me/badges");
        using var doc = JsonDocument.Parse(await list.Content.ReadAsStringAsync());
        var level5 = doc.RootElement.EnumerateArray()
            .First(e => e.GetProperty("awardedAtLevel").GetInt32() == 5);
        var id = level5.GetProperty("id").GetString();

        var archive = await c.PostAsync($"/api/users/me/badges/{id}/archive", null);
        Assert.Equal(HttpStatusCode.OK, archive.StatusCode);

        // A partner/other user can't touch it.
        var other = await NewUserAsync();
        var foreign = await other.PostAsync($"/api/users/me/badges/{id}/archive", null);
        Assert.Equal(HttpStatusCode.NotFound, foreign.StatusCode);
    }

    [Fact]
    public async Task CheckIn_ResponseCarriesTotalPointsForTheClient()
    {
        var c = await NewUserAsync();
        var r = await CheckInAsync(c);
        using var doc = JsonDocument.Parse(await r.Content.ReadAsStringAsync());
        var rewards = doc.RootElement.GetProperty("rewards");
        Assert.Equal(10, rewards.GetProperty("pointsAwarded").GetInt32());
        Assert.Equal(10, rewards.GetProperty("totalPoints").GetInt32());
    }

    private async Task<HttpClient> NewUserAsync()
    {
        var c = _factory.CreateClient();
        var reg = await c.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Name = "Badge Tester", Email = $"badge-{Guid.NewGuid()}@example.com", Password = "MyPass123!",
        });
        var body = await reg.Content.ReadFromJsonAsync<AuthResponse>(
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body!.AccessToken);
        return c;
    }

    private static async Task<HttpResponseMessage> CheckInAsync(HttpClient c)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/moods/check-ins")
        {
            Content = JsonContent.Create(new { checkInType = "Morning", mood = "Happy", intensity = 7 }),
        };
        req.Headers.Add(ClientLocalTime.LocalDateHeader, DateTime.UtcNow.ToString("yyyy-MM-dd"));
        req.Headers.Add(ClientLocalTime.UtcOffsetHeader, "0");
        return await c.SendAsync(req);
    }

    private static async Task<int> CountBadgesAsync(HttpClient c)
    {
        var r = await c.GetAsync("/api/users/me/badges");
        using var doc = JsonDocument.Parse(await r.Content.ReadAsStringAsync());
        return doc.RootElement.GetArrayLength();
    }
}
