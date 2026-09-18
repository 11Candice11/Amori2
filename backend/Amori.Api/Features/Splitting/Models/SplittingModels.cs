using Amori.Api.Domain.Enums;

namespace Amori.Api.Features.Splitting.Models;

/// <summary>
/// Internal model used to compute a recommended support action from feelings and mood.
/// </summary>
public sealed class SplittingRecommendation
{
    public SplittingAction RecommendedAction { get; init; }
    public MoodType? BasedOnMood { get; init; }
    public IReadOnlyList<string> BasedOnFeelings { get; init; } = [];
}
