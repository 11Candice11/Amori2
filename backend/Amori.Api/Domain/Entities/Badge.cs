namespace Amori.Api.Domain.Entities;

/// <summary>
/// A badge earned by a user, typically as a reward for reaching a level milestone.
/// Badges can be saved to the vault for display as a personal achievement.
/// </summary>
public sealed class Badge : BaseEntity
{
    /// <summary>The user who earned this badge.</summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// The catalogue badge this row records (e.g. "first_embrace"), matching
    /// an id in the app's badge registry and an entry in
    /// <see cref="Features.Users.Services.BadgeCatalog"/>. Null for the
    /// server's level-milestone badges, which are keyed by
    /// <see cref="AwardedAtLevel"/> instead.
    /// </summary>
    public string? Slug { get; set; }

    /// <summary>The type/name of the badge (e.g., "Level 5", "Level 10", "Streak 7 Days").</summary>
    public string BadgeName { get; set; } = string.Empty;

    /// <summary>Description of what the badge represents (e.g., "Reached Level 5").</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// The level at which this badge was earned (for level-based badges, e.g., 5, 10, 15).
    /// Zero for catalogue badges (<see cref="Slug"/> set).
    /// </summary>
    public int AwardedAtLevel { get; set; }

    /// <summary>Storage key for the badge image (e.g., "badges/level-5.png").</summary>
    public string? ImageKey { get; set; }

    /// <summary>URL to the badge image (can be presigned for S3).</summary>
    public string? ImageUrl { get; set; }

    /// <summary>Whether this badge has been saved to the vault (archived).</summary>
    public bool IsArchivedInVault { get; set; } = false;

    /// <summary>When the badge was earned (when unlocked).</summary>
    public DateTime EarnedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
