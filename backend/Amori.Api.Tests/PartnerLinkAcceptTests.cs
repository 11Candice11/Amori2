using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Amori.Api.Features.Auth.DTOs;
using Amori.Api.Features.Relationships.DTOs;
using Xunit;

namespace Amori.Api.Tests;

public sealed class PartnerLinkAcceptTests(AmoriWebApplicationFactory factory)
    : IClassFixture<AmoriWebApplicationFactory>, IAsyncLifetime
{
    public async Task InitializeAsync() => await factory.EnsureDatabaseCreatedAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    // Regression: accepting a partner-link request used to 500 with
    // "An unexpected error occurred." whenever the accepter already had their
    // own (solo) relationship, because MergeRelationshipsAsync opened a
    // user-initiated transaction while EnableRetryOnFailure was configured.
    [Fact]
    public async Task AcceptRequest_WhenBothHaveSoloRelationships_MergesSuccessfully()
    {
        var inviterEmail = $"inviter-{Guid.NewGuid()}@example.com";
        var accepterEmail = $"accepter-{Guid.NewGuid()}@example.com";

        var inviterToken = await RegisterAndGetTokenAsync(inviterEmail);
        var accepterToken = await RegisterAndGetTokenAsync(accepterEmail);

        // Both users create their own solo relationship first, forcing the merge path on accept.
        using var inviter = factory.CreateClient();
        inviter.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", inviterToken);
        var inviterRel = await inviter.PostAsync("/api/relationships",
            Json(new CreateRelationshipRequest { StartDate = new DateOnly(2023, 1, 1) }));
        Assert.Equal(HttpStatusCode.Created, inviterRel.StatusCode);

        using var accepter = factory.CreateClient();
        accepter.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accepterToken);
        var accepterRel = await accepter.PostAsync("/api/relationships",
            Json(new CreateRelationshipRequest { StartDate = new DateOnly(2022, 5, 5) }));
        Assert.Equal(HttpStatusCode.Created, accepterRel.StatusCode);

        // Inviter sends a partner-link request to the accepter.
        var sendResp = await inviter.PostAsync("/api/partner-link/requests",
            Json(new SendPartnerLinkRequest { Email = accepterEmail }));
        var sendBody = await sendResp.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.Created, sendResp.StatusCode);

        var requestId = JsonDocument.Parse(sendBody).RootElement.GetProperty("id").GetGuid();

        // Accepter accepts — this triggers the relationship merge path.
        var acceptResp = await accepter.PostAsync($"/api/partner-link/requests/{requestId}/accept",
            Json(new AcceptPartnerLinkRequest { StartDate = new DateOnly(2021, 2, 14) }));
        var acceptBody = await acceptResp.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, acceptResp.StatusCode);

        // The merged relationship should now contain both partners.
        using var acceptDoc = JsonDocument.Parse(acceptBody);
        Assert.Equal(2, acceptDoc.RootElement.GetProperty("members").GetArrayLength());
        Assert.Equal("2021-02-14", acceptDoc.RootElement.GetProperty("startDate").GetString());
    }

    private async Task<string> RegisterAndGetTokenAsync(string email)
    {
        using var client = factory.CreateClient();
        var resp = await client.PostAsync("/api/auth/register",
            Json(new RegisterRequest { Name = "Test", Email = email, Password = "TestPass123!" }));

        var body = JsonSerializer.Deserialize<AuthResponse>(
            await resp.Content.ReadAsStringAsync(),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        return body!.AccessToken;
    }

    private static StringContent Json<T>(T value) =>
        new(JsonSerializer.Serialize(value), System.Text.Encoding.UTF8, "application/json");
}
