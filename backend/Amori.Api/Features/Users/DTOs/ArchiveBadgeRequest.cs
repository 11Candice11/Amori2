namespace Amori.Api.Features.Users.DTOs;

/// <summary>
/// Request to archive a badge to the user's vault.
/// POST /api/users/me/badges/{badgeId}/archive
/// </summary>
public sealed class ArchiveBadgeRequest
{
    // This is just a marker request - the badge ID comes from the URL.
    // The endpoint will mark the badge as archived/saved to vault.
}
