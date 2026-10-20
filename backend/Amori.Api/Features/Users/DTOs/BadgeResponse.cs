using System.Text.Json.Serialization;

namespace Amori.Api.Features.Users.DTOs;

/// <summary>
/// Response containing a user's earned badge information.
/// </summary>
public sealed class BadgeResponse
{
    /// <summary>Unique badge ID.</summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The app's badge id (e.g. "first_embrace") for catalogue badges; null for
    /// level-milestone badges.
    /// </summary>
    public string? Slug { get; set; }

    /// <summary>The name/type of the badge (e.g., "Level 5", "Level 10").</summary>
    public string BadgeName { get; set; } = string.Empty;

    /// <summary>Description of what the badge represents.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>The level at which this badge was earned.</summary>
    public int AwardedAtLevel { get; set; }

    /// <summary>URL to the badge image.</summary>
    public string? ImageUrl { get; set; }

    /// <summary>Whether this badge has been saved to the vault.</summary>
    public bool IsArchivedInVault { get; set; }

    /// <summary>When the badge was earned (ISO 8601).</summary>
    public DateTime EarnedAt { get; set; }

    /// <summary>
    /// What saving this badge earned — present only on the archive response,
    /// and only for the first save. The app applies it like any other action's
    /// rewards. Omitted from badge lists.
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Common.Responses.RewardsResponse? Rewards { get; set; }
}
