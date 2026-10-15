namespace Amori.Api.Features.Hugs.DTOs;

public sealed class HugResponse
{
    public Guid Id { get; init; }
    public Guid RelationshipId { get; init; }
    public Guid SenderId { get; init; }
    public string SenderName { get; init; } = string.Empty;
    public Guid RecipientId { get; init; }
    public string RecipientName { get; init; } = string.Empty;
    public string? Whisper { get; init; }
    public bool IsAcknowledged { get; init; }
    public DateTime? AcknowledgedAt { get; init; }
    public DateTime CreatedAt { get; init; }

    /// <summary>How long the sender held the hug, when the app reported it.</summary>
    public int? HoldDurationMs { get; init; }

    /// <summary>
    /// Points and badges this hug earned. Never null — an empty
    /// <see cref="Common.Responses.RewardsResponse"/> when it earned nothing.
    /// </summary>
    public Common.Responses.RewardsResponse Rewards { get; init; } = Common.Responses.RewardsResponse.None;
}
