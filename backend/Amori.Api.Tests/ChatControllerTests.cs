using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Amori.Api.Features.Auth.DTOs;
using Amori.Api.Features.LetsChat.DTOs;
using Amori.Api.Features.Relationships.DTOs;
using Xunit;

namespace Amori.Api.Tests;

/// <summary>
/// End-to-end tests for the guided "Let's Chat" feature. They pin down the
/// rules the mobile client relies on the server to enforce: template loading,
/// per-template composition, required-field validation, draft privacy, sending,
/// partner visibility, read state, notification creation, duplicate-send
/// protection, and unlinked-user behaviour.
/// </summary>
public sealed class ChatControllerTests(AmoriWebApplicationFactory factory)
    : IClassFixture<AmoriWebApplicationFactory>, IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public async Task InitializeAsync() => await factory.EnsureDatabaseCreatedAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    // ── Template loading ───────────────────────────────────────────────────

    [Fact]
    public async Task GetTemplates_ReturnsAllSixGuidedTemplates()
    {
        var couple = await CreateLinkedCoupleAsync();

        var response = await couple.PartnerA.GetAsync("/api/chat/templates");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var types = doc.RootElement.EnumerateArray()
            .Select(t => t.GetProperty("type").GetString())
            .ToList();

        Assert.Equal(6, types.Count);
        Assert.Contains("Feeling", types);
        Assert.Contains("Appreciation", types);
        Assert.Contains("Need", types);
        Assert.Contains("SomethingBotheredMe", types);
        Assert.Contains("SomethingOnMyMind", types);
        Assert.Contains("Future", types);
    }

    [Fact]
    public async Task GetTemplates_FeelingTemplateHasOrderedPrefixedSteps()
    {
        var couple = await CreateLinkedCoupleAsync();

        var response = await couple.PartnerA.GetAsync("/api/chat/templates");
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        var feeling = doc.RootElement.EnumerateArray()
            .First(t => t.GetProperty("type").GetString() == "Feeling");
        var steps = feeling.GetProperty("steps").EnumerateArray().ToList();

        Assert.Equal(3, steps.Count);
        Assert.Equal("feeling", steps[0].GetProperty("input").GetString());
        Assert.Equal("I feel", steps[0].GetProperty("prefix").GetString());
        Assert.Equal("because of", steps[1].GetProperty("prefix").GetString());
        Assert.Equal("and I needed", steps[2].GetProperty("prefix").GetString());
    }

    // ── Each template type composes correctly ────────────────────────────────

    [Theory]
    [InlineData("Feeling", "I feel tender because of a long week and I needed rest.")]
    [InlineData("Appreciation", "I appreciate you because you listened and it meant the world.")]
    [InlineData("Need", "Right now I need quiet because I'm frayed.")]
    [InlineData("SomethingBotheredMe", "Something that bothered me was the silence I felt unseen and I would like to reconnect.")]
    [InlineData("SomethingOnMyMind", "Something on my mind is our next trip.")]
    [InlineData("Future", "I would love for us to travel more because it grounds us.")]
    public async Task Send_ComposesTheSentenceForEachTemplateType(string templateType, string expected)
    {
        var couple = await CreateLinkedCoupleAsync();
        var answers = AnswersFor(templateType);

        var id = await CreateDraftAsync(couple.PartnerA, templateType, answers);
        var sent = await couple.PartnerA.PostAsync($"/api/chat/{id}/send", Empty());
        Assert.Equal(HttpStatusCode.OK, sent.StatusCode);

        var body = await ReadJsonAsync(sent);
        Assert.Equal(expected, body.GetProperty("composedMessage").GetString());
        Assert.Equal("Sent", body.GetProperty("status").GetString());
    }

    // ── Required-field validation ────────────────────────────────────────────

    [Fact]
    public async Task Send_WithAMissingRequiredAnswer_IsRejected()
    {
        var couple = await CreateLinkedCoupleAsync();
        // "need" is required for the Feeling template but omitted here.
        var id = await CreateDraftAsync(couple.PartnerA, "Feeling", new()
        {
            ["feeling"] = "tender",
            ["situation"] = "a long week",
        });

        var sent = await couple.PartnerA.PostAsync($"/api/chat/{id}/send", Empty());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, sent.StatusCode);

        // Still a private draft — nothing leaked to the partner.
        var partnerList = await ListAsync(couple.PartnerB);
        Assert.Empty(partnerList);
    }

    [Fact]
    public async Task Send_TreatsWhitespaceOnlyAnswerAsEmpty()
    {
        var couple = await CreateLinkedCoupleAsync();
        var id = await CreateDraftAsync(couple.PartnerA, "Need", new()
        {
            ["need"] = "   ",
            ["reason"] = "I'm frayed",
        });

        var sent = await couple.PartnerA.PostAsync($"/api/chat/{id}/send", Empty());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, sent.StatusCode);
    }

    // ── Drafts: privacy ──────────────────────────────────────────────────────

    [Fact]
    public async Task Draft_IsNeverVisibleToThePartner()
    {
        var couple = await CreateLinkedCoupleAsync();
        var id = await CreateDraftAsync(couple.PartnerA, "Feeling", AnswersFor("Feeling"));

        // Author sees their own draft.
        var mineList = await ListAsync(couple.PartnerA);
        Assert.Single(mineList);

        // Partner sees nothing, and a direct fetch 404s (indistinguishable from
        // "doesn't exist").
        var partnerList = await ListAsync(couple.PartnerB);
        Assert.Empty(partnerList);

        var partnerFetch = await couple.PartnerB.GetAsync($"/api/chat/{id}");
        Assert.Equal(HttpStatusCode.NotFound, partnerFetch.StatusCode);
    }

    [Fact]
    public async Task SavePrivately_KeepsTheMessageHiddenFromThePartner()
    {
        var couple = await CreateLinkedCoupleAsync();
        var id = await CreateDraftAsync(couple.PartnerA, "Feeling", AnswersFor("Feeling"));

        var saved = await couple.PartnerA.PatchAsync($"/api/chat/{id}",
            Json(new UpdateChatRequest { Status = Amori.Api.Domain.Enums.ChatMessageStatus.Private }));
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        Assert.Equal("Private", (await ReadJsonAsync(saved)).GetProperty("status").GetString());

        var partnerList = await ListAsync(couple.PartnerB);
        Assert.Empty(partnerList);
    }

    [Fact]
    public async Task Update_PreservesAndOverwritesAnswers()
    {
        var couple = await CreateLinkedCoupleAsync();
        var id = await CreateDraftAsync(couple.PartnerA, "Feeling", new() { ["feeling"] = "tender" });

        // Add more answers later (mirrors the client moving forward a step and
        // autosaving) — earlier answers are preserved.
        var updated = await couple.PartnerA.PatchAsync($"/api/chat/{id}",
            Json(new UpdateChatRequest
            {
                Answers = new() { ["feeling"] = "tender", ["situation"] = "a long week", ["need"] = "rest" },
            }));
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);

        var body = await ReadJsonAsync(updated);
        var answers = body.GetProperty("answers");
        Assert.Equal("tender", answers.GetProperty("feeling").GetString());
        Assert.Equal("a long week", answers.GetProperty("situation").GetString());
        Assert.Equal("rest", answers.GetProperty("need").GetString());
    }

    // ── Sending / partner visibility / read state ────────────────────────────

    [Fact]
    public async Task Send_MakesTheMessageVisibleToThePartner()
    {
        var couple = await CreateLinkedCoupleAsync();
        var id = await CreateDraftAsync(couple.PartnerA, "Appreciation", AnswersFor("Appreciation"));

        var sent = await couple.PartnerA.PostAsync($"/api/chat/{id}/send", Empty());
        Assert.Equal(HttpStatusCode.OK, sent.StatusCode);

        // The partner can now see and fetch it.
        var partnerList = await ListAsync(couple.PartnerB);
        Assert.Single(partnerList);
        Assert.False(partnerList[0].GetProperty("isMine").GetBoolean());

        var fetch = await couple.PartnerB.GetAsync($"/api/chat/{id}");
        Assert.Equal(HttpStatusCode.OK, fetch.StatusCode);
    }

    [Fact]
    public async Task MarkRead_ByTheRecipient_SetsReadState()
    {
        var couple = await CreateLinkedCoupleAsync();
        var id = await CreateDraftAsync(couple.PartnerA, "Need", AnswersFor("Need"));
        await couple.PartnerA.PostAsync($"/api/chat/{id}/send", Empty());

        var read = await couple.PartnerB.PostAsync($"/api/chat/{id}/read", Empty());
        Assert.Equal(HttpStatusCode.OK, read.StatusCode);

        var body = await ReadJsonAsync(read);
        Assert.Equal("Read", body.GetProperty("status").GetString());
        Assert.False(body.GetProperty("readAt").ValueKind == JsonValueKind.Null);
    }

    [Fact]
    public async Task MarkRead_BySender_IsRejected()
    {
        var couple = await CreateLinkedCoupleAsync();
        var id = await CreateDraftAsync(couple.PartnerA, "Need", AnswersFor("Need"));
        await couple.PartnerA.PostAsync($"/api/chat/{id}/send", Empty());

        // Only the recipient may mark a message read.
        var read = await couple.PartnerA.PostAsync($"/api/chat/{id}/read", Empty());
        Assert.Equal(HttpStatusCode.Unauthorized, read.StatusCode);
    }

    // ── Notification creation ────────────────────────────────────────────────

    [Fact]
    public async Task Send_CreatesALetsChatNotificationForThePartner_WithoutTheBody()
    {
        var couple = await CreateLinkedCoupleAsync();
        var id = await CreateDraftAsync(couple.PartnerA, "Feeling", AnswersFor("Feeling"));
        await couple.PartnerA.PostAsync($"/api/chat/{id}/send", Empty());

        var notifications = await couple.PartnerB.GetAsync("/api/notifications");
        using var doc = JsonDocument.Parse(await notifications.Content.ReadAsStringAsync());

        var letsChat = doc.RootElement.EnumerateArray()
            .FirstOrDefault(n => n.GetProperty("notificationType").GetString() == "LetsChat");
        Assert.Equal(JsonValueKind.Object, letsChat.ValueKind);
        // Metadata to deep-link to the conversation.
        Assert.Equal(id.ToString(), letsChat.GetProperty("referenceId").GetString());
        // The sensitive composed message must NOT be in the notification body.
        Assert.DoesNotContain("I feel", letsChat.GetProperty("body").GetString() ?? string.Empty);
    }

    // ── Duplicate-send protection ────────────────────────────────────────────

    [Fact]
    public async Task Send_Twice_DoesNotCreateASecondNotification()
    {
        var couple = await CreateLinkedCoupleAsync();
        var id = await CreateDraftAsync(couple.PartnerA, "Feeling", AnswersFor("Feeling"));

        var first = await couple.PartnerA.PostAsync($"/api/chat/{id}/send", Empty());
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        // Second send is idempotent — succeeds but changes nothing.
        var second = await couple.PartnerA.PostAsync($"/api/chat/{id}/send", Empty());
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        var notifications = await couple.PartnerB.GetAsync("/api/notifications");
        using var doc = JsonDocument.Parse(await notifications.Content.ReadAsStringAsync());
        var count = doc.RootElement.EnumerateArray()
            .Count(n => n.GetProperty("notificationType").GetString() == "LetsChat");
        Assert.Equal(1, count);
    }

    // ── Editing / deleting after send ────────────────────────────────────────

    [Fact]
    public async Task Update_AfterSend_IsRejected()
    {
        var couple = await CreateLinkedCoupleAsync();
        var id = await CreateDraftAsync(couple.PartnerA, "Feeling", AnswersFor("Feeling"));
        await couple.PartnerA.PostAsync($"/api/chat/{id}/send", Empty());

        var edit = await couple.PartnerA.PatchAsync($"/api/chat/{id}",
            Json(new UpdateChatRequest { Answers = new() { ["feeling"] = "changed" } }));
        Assert.Equal(HttpStatusCode.Conflict, edit.StatusCode);
    }

    [Fact]
    public async Task Delete_AnUnsentDraft_Succeeds()
    {
        var couple = await CreateLinkedCoupleAsync();
        var id = await CreateDraftAsync(couple.PartnerA, "Feeling", AnswersFor("Feeling"));

        var deleted = await couple.PartnerA.DeleteAsync($"/api/chat/{id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        var fetch = await couple.PartnerA.GetAsync($"/api/chat/{id}");
        Assert.Equal(HttpStatusCode.NotFound, fetch.StatusCode);
    }

    // ── Unlinked users ───────────────────────────────────────────────────────

    [Fact]
    public async Task Send_WithoutALinkedPartner_IsRejected()
    {
        var solo = await CreateSoloUserAsync();
        var id = await CreateDraftAsync(solo, "Feeling", AnswersFor("Feeling"));

        // A solo user can compose a private draft but has no partner to send to.
        var sent = await solo.PostAsync($"/api/chat/{id}/send", Empty());
        Assert.Equal(HttpStatusCode.Conflict, sent.StatusCode);
    }

    [Fact]
    public async Task Get_AConversationFromAnotherRelationship_IsNotVisible()
    {
        var couple = await CreateLinkedCoupleAsync();
        var outsider = await CreateLinkedCoupleAsync();
        var foreignId = await CreateDraftAsync(outsider.PartnerA, "Feeling", AnswersFor("Feeling"));
        await outsider.PartnerA.PostAsync($"/api/chat/{foreignId}/send", Empty());

        var response = await couple.PartnerA.GetAsync($"/api/chat/{foreignId}");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static Dictionary<string, string> AnswersFor(string templateType) => templateType switch
    {
        "Feeling" => new() { ["feeling"] = "tender", ["situation"] = "a long week", ["need"] = "rest" },
        "Appreciation" => new() { ["person"] = "you", ["action"] = "you listened", ["reason"] = "the world" },
        "Need" => new() { ["need"] = "quiet", ["reason"] = "I'm frayed" },
        "SomethingBotheredMe" => new() { ["situation"] = "the silence", ["feeling"] = "unseen", ["desiredOutcome"] = "to reconnect" },
        "SomethingOnMyMind" => new() { ["thought"] = "our next trip" },
        "Future" => new() { ["goal"] = "travel more", ["reason"] = "it grounds us" },
        _ => new(),
    };

    private async Task<Guid> CreateDraftAsync(HttpClient client, string templateType, Dictionary<string, string> answers)
    {
        var type = Enum.Parse<Amori.Api.Domain.Enums.ChatTemplateType>(templateType);
        var response = await client.PostAsync("/api/chat",
            Json(new CreateChatRequest { TemplateType = type, Answers = answers }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await ReadJsonAsync(response)).GetProperty("id").GetGuid();
    }

    private async Task<List<JsonElement>> ListAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/chat");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.EnumerateArray().Select(e => e.Clone()).ToList();
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.Clone();
    }

    private sealed record Couple(HttpClient PartnerA, HttpClient PartnerB);

    private async Task<Couple> CreateLinkedCoupleAsync()
    {
        var inviterEmail = $"chat-a-{Guid.NewGuid()}@example.com";
        var accepterEmail = $"chat-b-{Guid.NewGuid()}@example.com";

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

    /// <summary>A registered user with a solo relationship but no linked partner.</summary>
    private async Task<HttpClient> CreateSoloUserAsync()
    {
        var client = await RegisterClientAsync($"chat-solo-{Guid.NewGuid()}@example.com");
        var relationship = await client.PostAsync("/api/relationships",
            Json(new CreateRelationshipRequest { StartDate = new DateOnly(2023, 1, 1) }));
        Assert.Equal(HttpStatusCode.Created, relationship.StatusCode);
        return client;
    }

    private async Task<HttpClient> RegisterClientAsync(string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsync("/api/auth/register",
            Json(new RegisterRequest { Name = "Test", Email = email, Password = "TestPass123!" }));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = JsonSerializer.Deserialize<AuthResponse>(
            await response.Content.ReadAsStringAsync(), JsonOpts);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", body!.AccessToken);
        return client;
    }

    private static StringContent Json<T>(T value) =>
        new(JsonSerializer.Serialize(value), System.Text.Encoding.UTF8, "application/json");

    private static StringContent Empty() =>
        new(string.Empty, System.Text.Encoding.UTF8, "application/json");
}
