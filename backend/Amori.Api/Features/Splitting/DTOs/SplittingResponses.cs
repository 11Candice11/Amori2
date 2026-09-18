using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Splitting.DTOs;

public sealed class SplittingSessionResponse
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public Guid RelationshipId { get; init; }
    public List<string> FeelingsSelected { get; init; } = [];
    public string? Trigger { get; init; }
    public string? Description { get; init; }
    public string? WhatINeed { get; init; }
    public SplittingAction? RecommendedSupportType { get; init; }
    public List<SplittingAction> ActionsTaken { get; init; } = [];
    public MoodType? InitialMood { get; init; }
    public MoodType? FinalMood { get; init; }
    public SplittingSessionStatus Status { get; init; }
    /// <summary>Absolute UTC end of the self-regulation window, or null if none.</summary>
    public DateTime? SpaceEndsAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
}

/// <summary>
/// Privacy-safe view of a partner's active grounding session. Deliberately
/// omits the private details (feelings, triggers, description, moods) — the
/// partner only sees that a self-regulation window is active, the care
/// preference shared, and how much time is left.
/// </summary>
public sealed class PartnerSplittingWindowResponse
{
    public Guid SessionId { get; init; }
    /// <summary>The support type the person chose to share, if any.</summary>
    public SplittingAction? RecommendedSupportType { get; init; }
    /// <summary>Absolute UTC end of the self-regulation window, or null if open-ended.</summary>
    public DateTime? SpaceEndsAt { get; init; }
    /// <summary>When the session started, for context.</summary>
    public DateTime StartedAt { get; init; }
}
