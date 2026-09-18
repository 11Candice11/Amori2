using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Splitting.DTOs;

public sealed class CreateSplittingSessionRequest
{
    public List<string> FeelingsSelected { get; set; } = [];
    public string? Trigger { get; set; }
    public string? Description { get; set; }
    public string? WhatINeed { get; set; }
    public MoodType? InitialMood { get; set; }
}

public sealed class UpdateSplittingSessionRequest
{
    public List<string>? FeelingsSelected { get; set; }
    public string? Trigger { get; set; }
    public string? Description { get; set; }
    public string? WhatINeed { get; set; }
    public List<SplittingAction>? ActionsTaken { get; set; }
    public MoodType? FinalMood { get; set; }

    /// <summary>
    /// Absolute UTC end of the requested self-regulation window. Send an
    /// explicit value to start/extend the shared countdown; omit (null) to
    /// leave it unchanged.
    /// </summary>
    public DateTime? SpaceEndsAt { get; set; }
}

public sealed class CompleteSplittingSessionRequest
{
    public MoodType? FinalMood { get; set; }
    public List<SplittingAction>? ActionsTaken { get; set; }
}
