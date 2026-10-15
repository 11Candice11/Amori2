namespace Amori.Api.Features.Users.DTOs;
using Amori.Api.Domain.Enums;

/// <summary>
/// Request to award points to the current user.
/// POST /api/users/me/points
/// </summary>
public sealed class AddPointsRequest
{
    /// <summary>The type of activity that earned the points.</summary>
    public ActivityType ActivityType { get; set; }

    /// <summary>Number of points to award (usually derived from ActivityType, but can be overridden).</summary>
    public int Amount { get; set; }

    /// <summary>Optional reference ID (e.g., memory ID for gift opened, card number for collection).</summary>
    public Guid? ReferenceId { get; set; }

    /// <summary>Optional additional metadata (e.g., "cardNumber=5" for card collection).</summary>
    public string? Metadata { get; set; }
}
