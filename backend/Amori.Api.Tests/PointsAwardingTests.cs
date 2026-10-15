using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Amori.Api.Common.Time;
using Amori.Api.Features.Auth.DTOs;
using Xunit;

namespace Amori.Api.Tests;

/// <summary>
/// Points are earned by doing things, awarded by the server.
///
/// The behaviour these cover used to be broken in three separate ways at once:
/// nothing on either side awarded points, the tables had no migration, and the
/// award path never persisted a user's first points row. Each test below pins
/// down one of those.
/// </summary>
public sealed class PointsAwardingTests(AmoriWebApplicationFactory factory)
    : IClassFixture<AmoriWebApplicationFactory>, IAsyncLifetime
{
    private readonly HttpClient _client = factory.CreateClient();

    public async Task InitializeAsync() => await factory.EnsureDatabaseCreatedAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task CheckIn_ShouldAwardPointsToAFirstTimeUser()
    {
        // Regression: BaseEntity seeds Id, so the old "is the Id empty?" test
        // for a new points row was never true and the row was never inserted.
        // A brand-new user is therefore the case that used to fail.
        await AuthenticateNewUserAsync();
        await AssertTotalPointsAsync(0);

        var response = await CheckInAsync(localDate: "2026-10-13", utcOffsetMinutes: 0);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(10, await ReadPointsAwardedAsync(response));
        await AssertTotalPointsAsync(10);
    }

    [Fact]
    public async Task CheckIn_ShouldAwardOnlyOncePerLocalDay()
    {
        await AuthenticateNewUserAsync();

        var first = await CheckInAsync("2026-10-13", 0);
        var second = await CheckInAsync("2026-10-13", 0);

        Assert.Equal(10, await ReadPointsAwardedAsync(first));
        Assert.Equal(0, await ReadPointsAwardedAsync(second));
        await AssertTotalPointsAsync(10);
    }

    [Fact]
    public async Task CheckIn_ShouldAwardAgainOnTheNextLocalDay()
    {
        await AuthenticateNewUserAsync();

        await CheckInAsync("2026-10-13", 0);
        var nextDay = await CheckInAsync("2026-10-14", 0);

        Assert.Equal(10, await ReadPointsAwardedAsync(nextDay));
        await AssertTotalPointsAsync(20);
    }

    [Fact]
    public async Task CheckIn_ShouldTreatEachPartnersOwnDayAsTheirOwn()
    {
        // Two users, same UTC instant, different sides of the date line. Each
        // one's "today" is their own; neither should be told they have already
        // checked in because of the other's calendar.
        await AuthenticateNewUserAsync();
        var aheadOfUtc = await CheckInAsync("2026-10-14", 780);   // UTC+13
        Assert.Equal(10, await ReadPointsAwardedAsync(aheadOfUtc));

        await AuthenticateNewUserAsync();
        var behindUtc = await CheckInAsync("2026-10-12", -660);   // UTC-11
        Assert.Equal(10, await ReadPointsAwardedAsync(behindUtc));
    }

    [Theory]
    [InlineData(840)]    // UTC+14, Kiritimati
    [InlineData(-720)]   // UTC-12
    public async Task CheckIn_ShouldAcceptTheWidestRealOffsets(int offsetMinutes)
    {
        await AuthenticateNewUserAsync();

        // A legitimate extreme offset puts the device at most one day from UTC,
        // so the date is still believed.
        var localDate = DateTime.UtcNow.AddMinutes(offsetMinutes).ToString("yyyy-MM-dd");
        var response = await CheckInAsync(localDate, offsetMinutes);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(10, await ReadPointsAwardedAsync(response));
    }

    [Theory]
    [InlineData(841)]
    [InlineData(-841)]
    public async Task CheckIn_ShouldRejectAnImpossibleOffset(int offsetMinutes)
    {
        await AuthenticateNewUserAsync();

        var response = await CheckInAsync("2026-10-13", offsetMinutes);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task CheckIn_ShouldIgnoreAFabricatedFutureDate()
    {
        // Someone winding their clock forward to farm a daily award gets the
        // server's date instead, so the second check-in still earns nothing.
        await AuthenticateNewUserAsync();

        await CheckInAsync(DateTime.UtcNow.ToString("yyyy-MM-dd"), 0);
        var tampered = await CheckInAsync(DateTime.UtcNow.AddDays(30).ToString("yyyy-MM-dd"), 0);

        // The check-in itself still succeeds — only the claimed date is ignored.
        Assert.Equal(HttpStatusCode.Created, tampered.StatusCode);
        Assert.Equal(0, await ReadPointsAwardedAsync(tampered));
        await AssertTotalPointsAsync(10);
    }

    [Fact]
    public async Task AddPoints_ShouldRefuseAnythingButAManualAdjustment()
    {
        // The client no longer gets to say it sent a hug — or how much that is
        // worth. Those points come from the hug endpoint doing the work.
        await AuthenticateNewUserAsync();

        var response = await _client.PostAsJsonAsync("/api/users/me/points", new
        {
            activityType = "HugSent",
            amount = 10_000,
        });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        await AssertTotalPointsAsync(0);
    }

    [Fact]
    public async Task AddPoints_ShouldApplyAManualAdjustment()
    {
        await AuthenticateNewUserAsync();

        var response = await _client.PostAsJsonAsync("/api/users/me/points", new
        {
            activityType = "ManualAdjustment",
            // Each level costs level × 100 more than the last, so the running
            // cost is 100 / 300 / 600 / 1000 … — 1000 lands exactly on level 5,
            // which is also the first badge threshold.
            amount = 1_000,
            metadata = "support credit",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(1_000, doc.RootElement.GetProperty("newTotalPoints").GetInt32());
        Assert.Equal(5, doc.RootElement.GetProperty("newLevel").GetInt32());
        Assert.True(doc.RootElement.GetProperty("leveledUp").GetBoolean());
        Assert.Equal("Level 5", doc.RootElement.GetProperty("newBadge").GetProperty("badgeName").GetString());
    }

    [Fact]
    public async Task AddPoints_ShouldAwardEveryBadgeThresholdCrossedAtOnce()
    {
        // Regression: the old code only looked at the level it landed on, so a
        // jump straight past several thresholds awarded nothing at all.
        // 122,500 is the cumulative cost of level 50 — every threshold at once.
        await AuthenticateNewUserAsync();

        await _client.PostAsJsonAsync("/api/users/me/points", new
        {
            activityType = "ManualAdjustment",
            amount = 122_500,
        });

        var badges = await _client.GetAsync("/api/users/me/badges");
        using var doc = JsonDocument.Parse(await badges.Content.ReadAsStringAsync());

        // Thresholds are 5, 10, 15, 20, 25, 30, 40, 50 — note the gaps at 35/45.
        Assert.Equal(8, doc.RootElement.GetArrayLength());
    }

    [Fact]
    public async Task PointsHistory_ShouldRecordTheLocalDateTheActivityHappenedOn()
    {
        await AuthenticateNewUserAsync();
        await CheckInAsync("2026-10-13", 780);

        var history = await _client.GetAsync("/api/users/me/points/history");
        using var doc = JsonDocument.Parse(await history.Content.ReadAsStringAsync());
        var entry = doc.RootElement[0];

        Assert.Equal("MorningCheckIn", entry.GetProperty("activityType").GetString());
        Assert.Equal("2026-10-13", entry.GetProperty("localDate").GetString());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private async Task AuthenticateNewUserAsync()
    {
        var email = $"points-{Guid.NewGuid()}@example.com";

        var registration = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Name = "Points Tester",
            Email = email,
            Password = "MyPass123!",
        });

        var body = await registration.Content.ReadFromJsonAsync<AuthResponse>(
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", body!.AccessToken);
    }

    private async Task<HttpResponseMessage> CheckInAsync(string localDate, int utcOffsetMinutes)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/moods/check-ins")
        {
            Content = JsonContent.Create(new
            {
                checkInType = "Morning",
                mood = "Happy",
                intensity = 7,
            }),
        };

        request.Headers.Add(ClientLocalTime.LocalDateHeader, localDate);
        request.Headers.Add(ClientLocalTime.UtcOffsetHeader, utcOffsetMinutes.ToString());

        return await _client.SendAsync(request);
    }

    private static async Task<int> ReadPointsAwardedAsync(HttpResponseMessage response)
    {
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.GetProperty("rewards").GetProperty("pointsAwarded").GetInt32();
    }

    private async Task AssertTotalPointsAsync(int expected)
    {
        var response = await _client.GetAsync("/api/users/me/points");
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        Assert.Equal(expected, doc.RootElement.GetProperty("totalPoints").GetInt32());
    }
}
