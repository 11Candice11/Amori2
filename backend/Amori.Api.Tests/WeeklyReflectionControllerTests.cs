using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Amori.Api.Features.Auth.DTOs;
using Amori.Api.Features.WeeklyReflection.DTOs;
using Xunit;

namespace Amori.Api.Tests;

/// <summary>
/// Kept weekly reflections are private per person and durable across devices
/// (server-backed). These tests pin down the archive contract: snapshots round
/// trip verbatim, one entry per week (re-saving overwrites), the list is
/// newest-first, and one partner's archive is invisible to the other — the same
/// posture as the Hearth Vault.
/// </summary>
public sealed class WeeklyReflectionControllerTests(AmoriWebApplicationFactory factory)
    : IClassFixture<AmoriWebApplicationFactory>, IAsyncLifetime
{
    public async Task InitializeAsync() => await factory.EnsureDatabaseCreatedAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Save_ThenGet_RoundTripsTheSnapshotVerbatim()
    {
        var user = await RegisterClientAsync($"wr-{Guid.NewGuid()}@example.com");

        var req = SampleRequest("2026-10-12", "October 12 – 18, 2026");
        var saved = await user.PostAsync("/api/weekly-reflections", Json(req));
        Assert.Equal(HttpStatusCode.Created, saved.StatusCode);

        var fetched = await user.GetAsync("/api/weekly-reflections/2026-10-12");
        Assert.Equal(HttpStatusCode.OK, fetched.StatusCode);

        using var doc = JsonDocument.Parse(await fetched.Content.ReadAsStringAsync());
        var root = doc.RootElement;
        Assert.Equal("2026-10-12", root.GetProperty("weekKey").GetString());
        Assert.Equal("October 12 – 18, 2026", root.GetProperty("rangeLabel").GetString());
        Assert.True(root.GetProperty("moodDataPartial").GetBoolean());

        var snap = root.GetProperty("snapshot");
        Assert.Equal(3, snap.GetProperty("checkInDays").GetInt32());
        Assert.Equal(2, snap.GetProperty("memoryCount").GetInt32());
        Assert.Equal("LOW_PLEASANT", snap.GetProperty("dominantQuadrant").GetString());
        Assert.Equal(2, snap.GetProperty("hugsSent").GetInt32());
        Assert.Equal(1, snap.GetProperty("hugsReceived").GetInt32());
        Assert.False(snap.GetProperty("isEmpty").GetBoolean());

        // Nested collections survive the jsonb round trip.
        var days = snap.GetProperty("days");
        Assert.Equal(2, days.GetArrayLength());
        Assert.Equal("Content", days[0].GetProperty("label").GetString());
        Assert.Equal("2026-10-12T00:00:00.000Z", days[0].GetProperty("date").GetString());

        var thumbs = snap.GetProperty("memoryThumbs");
        Assert.Equal(1, thumbs.GetArrayLength());
        Assert.Equal("Autumn walk", thumbs[0].GetProperty("title").GetString());

        var milestones = snap.GetProperty("milestones");
        Assert.Equal(1, milestones.GetArrayLength());
        Assert.Equal("bucketList", milestones[0].GetProperty("source").GetString());
    }

    [Fact]
    public async Task Save_SameWeekTwice_OverwritesRatherThanDuplicates()
    {
        var user = await RegisterClientAsync($"wr-{Guid.NewGuid()}@example.com");

        await user.PostAsync("/api/weekly-reflections",
            Json(SampleRequest("2026-10-12", "October 12 – 18, 2026")));

        // Re-save the same week with a different snapshot (init-only DTOs, so
        // build a fresh request rather than mutating).
        var updated = new SaveWeeklyReflectionRequest
        {
            WeekKey = "2026-10-12",
            RangeLabel = "October 12 – 18, 2026",
            MoodDataPartial = false,
            Snapshot = new WeeklyReflectionSnapshotDto { MemoryCount = 9, CheckInDays = 5 },
        };
        await user.PostAsync("/api/weekly-reflections", Json(updated));

        var all = await ReadAllAsync(user);
        Assert.Single(all);
        Assert.Equal(9, all[0].GetProperty("snapshot").GetProperty("memoryCount").GetInt32());
        Assert.Equal(5, all[0].GetProperty("snapshot").GetProperty("checkInDays").GetInt32());
    }

    [Fact]
    public async Task GetAll_ReturnsWeeksNewestFirst()
    {
        var user = await RegisterClientAsync($"wr-{Guid.NewGuid()}@example.com");

        await user.PostAsync("/api/weekly-reflections", Json(SampleRequest("2026-10-05", "wk1")));
        await user.PostAsync("/api/weekly-reflections", Json(SampleRequest("2026-10-19", "wk3")));
        await user.PostAsync("/api/weekly-reflections", Json(SampleRequest("2026-10-12", "wk2")));

        var all = await ReadAllAsync(user);
        Assert.Equal(
            new[] { "2026-10-19", "2026-10-12", "2026-10-05" },
            all.Select(e => e.GetProperty("weekKey").GetString()).ToArray());
    }

    [Fact]
    public async Task GetByWeekKey_AsAnotherUser_Returns404()
    {
        var owner = await RegisterClientAsync($"wr-a-{Guid.NewGuid()}@example.com");
        var other = await RegisterClientAsync($"wr-b-{Guid.NewGuid()}@example.com");

        await owner.PostAsync("/api/weekly-reflections",
            Json(SampleRequest("2026-10-12", "October 12 – 18, 2026")));

        var theirs = await other.GetAsync("/api/weekly-reflections/2026-10-12");
        Assert.Equal(HttpStatusCode.NotFound, theirs.StatusCode);

        // And it's absent from the other user's list entirely.
        Assert.Empty(await ReadAllAsync(other));
    }

    [Fact]
    public async Task Delete_AsOwner_RemovesIt_AsOther_Is404()
    {
        var owner = await RegisterClientAsync($"wr-a-{Guid.NewGuid()}@example.com");
        var other = await RegisterClientAsync($"wr-b-{Guid.NewGuid()}@example.com");

        await owner.PostAsync("/api/weekly-reflections",
            Json(SampleRequest("2026-10-12", "October 12 – 18, 2026")));

        var otherDelete = await other.DeleteAsync("/api/weekly-reflections/2026-10-12");
        Assert.Equal(HttpStatusCode.NotFound, otherDelete.StatusCode);
        Assert.Single(await ReadAllAsync(owner));

        var ownerDelete = await owner.DeleteAsync("/api/weekly-reflections/2026-10-12");
        Assert.Equal(HttpStatusCode.NoContent, ownerDelete.StatusCode);
        Assert.Empty(await ReadAllAsync(owner));
    }

    [Theory]
    [InlineData("")]
    [InlineData("2026/10/12")]
    [InlineData("last-week")]
    public async Task Save_WithAMalformedWeekKey_Returns422(string weekKey)
    {
        var user = await RegisterClientAsync($"wr-{Guid.NewGuid()}@example.com");

        var response = await user.PostAsync("/api/weekly-reflections",
            Json(SampleRequest(weekKey, "some label")));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_WithoutAuthentication_Returns401()
    {
        using var anonymous = factory.CreateClient();
        var response = await anonymous.GetAsync("/api/weekly-reflections");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static SaveWeeklyReflectionRequest SampleRequest(string weekKey, string rangeLabel) => new()
    {
        WeekKey = weekKey,
        RangeLabel = rangeLabel,
        MoodDataPartial = true,
        Snapshot = new WeeklyReflectionSnapshotDto
        {
            Days =
            [
                new WeeklyReflectionDayDto
                {
                    DayIndex = 0, Date = "2026-10-12T00:00:00.000Z", DayOfMonth = 12,
                    HasCheckIn = true, Quadrant = "LOW_PLEASANT", Label = "Content",
                },
                new WeeklyReflectionDayDto
                {
                    DayIndex = 1, Date = "2026-10-13T00:00:00.000Z", DayOfMonth = 13,
                    HasCheckIn = false, Quadrant = null, Label = null,
                },
            ],
            CheckInDays = 3,
            Distribution = new WeeklyReflectionDistributionDto { LOW_PLEASANT = 3 },
            DominantQuadrant = "LOW_PLEASANT",
            DominantCount = 3,
            MemoryCount = 2,
            MemoryThumbs =
            [
                new WeeklyReflectionMemoryThumbDto
                {
                    Id = "m1", Title = "Autumn walk",
                    ThumbnailUrl = "https://example.test/1.jpg",
                    CreatedByName = "Juan", MemoryDateTime = "2026-10-13T09:00:00.000Z",
                },
            ],
            HugsSent = 2,
            HugsReceived = 1,
            Milestones =
            [
                new WeeklyReflectionMilestoneDto
                {
                    Id = "b1", Title = "Book club", Kind = "Personal",
                    When = "2026-10-14", Source = "bucketList",
                },
            ],
            IsEmpty = false,
        },
    };

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

    private static async Task<List<JsonElement>> ReadAllAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/weekly-reflections");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.EnumerateArray().Select(e => e.Clone()).ToList();
    }

    private static StringContent Json<T>(T value) =>
        new(JsonSerializer.Serialize(value), System.Text.Encoding.UTF8, "application/json");
}
