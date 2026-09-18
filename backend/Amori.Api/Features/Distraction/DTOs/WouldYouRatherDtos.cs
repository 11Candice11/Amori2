namespace Amori.Api.Features.Distraction.DTOs;

// ─── Responses ────────────────────────────────────────────────────────────────

public sealed class WouldYouRatherQuestionResponse
{
    public Guid Id { get; init; }
    public string OptionA { get; init; } = string.Empty;
    public string OptionB { get; init; } = string.Empty;
    /// <summary>The current user's choice, if they've answered. True = Option A.</summary>
    public bool? MyChoiceIsOptionA { get; init; }
    /// <summary>The partner's choice, if they've answered. True = Option A.</summary>
    public bool? PartnerChoiceIsOptionA { get; init; }
    /// <summary>Author's user id, or null for a system prompt.</summary>
    public Guid? CreatedByUserId { get; init; }
    /// <summary>Author's display name, or null for a system prompt.</summary>
    public string? CreatedByName { get; init; }
    /// <summary>True when the current user authored this prompt.</summary>
    public bool IsMine { get; init; }
}

// ─── Requests ─────────────────────────────────────────────────────────────────

public sealed class SubmitWouldYouRatherRequest
{
    public bool ChoseOptionA { get; set; }
}

/// <summary>A partner authoring a new either/or prompt for the couple.</summary>
public sealed class CreateWouldYouRatherRequest
{
    public string OptionA { get; set; } = string.Empty;
    public string OptionB { get; set; } = string.Empty;
}
