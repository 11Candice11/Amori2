using Amori.Api.Domain.Enums;

namespace Amori.Api.Domain.Entities;

public sealed class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? PhoneNumber { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Active;
    public DateTime? LastActiveAt { get; set; }

    /// <summary>
    /// The UTC offset (minutes) the user's device last reported, via the
    /// X-Amori-Utc-Offset-Minutes header. Null until they've used an app build
    /// that sends it. Lets a hug know whether the two of you are in different
    /// time zones (Long Distance Hugger).
    /// </summary>
    public int? LastKnownUtcOffsetMinutes { get; set; }

    // Navigation
    public ICollection<RelationshipMember> RelationshipMemberships { get; set; } = [];
    public UserPoints? UserPoints { get; set; }
    public ICollection<Badge> Badges { get; set; } = [];
    public ICollection<PointsHistory> PointsHistory { get; set; } = [];
}
