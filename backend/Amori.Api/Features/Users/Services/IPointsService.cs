namespace Amori.Api.Features.Users.Services;
using Amori.Api.Domain.Enums;
using Amori.Api.Features.Users.DTOs;

/// <summary>
/// Business logic for user gamification (points and badges).
/// </summary>
public interface IPointsService
{
    /// <summary>
    /// Add points to a user for completing an activity.
    /// Returns the updated points/level and any new badges earned.
    /// </summary>
    Task<AddPointsResponse> AddPointsAsync(Guid userId, AddPointsRequest request, CancellationToken ct = default);

    /// <summary>
    /// Get the current user's points and level information.
    /// </summary>
    Task<UserPointsResponse> GetUserPointsAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Get all badges earned by a user.
    /// </summary>
    Task<List<BadgeResponse>> GetUserBadgesAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Archive a badge to the user's vault.
    /// </summary>
    Task<BadgeResponse> ArchiveBadgeToVaultAsync(Guid userId, Guid badgeId, CancellationToken ct = default);

    /// <summary>
    /// Get the points history/audit log for a user (admin/debugging only).
    /// </summary>
    Task<List<object>> GetPointsHistoryAsync(Guid userId, int limit = 50, CancellationToken ct = default);
}
