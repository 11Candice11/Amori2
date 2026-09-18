using Amori.Api.Features.Users.DTOs;

namespace Amori.Api.Features.Users.Services;

/// <summary>
/// Business logic for user profile operations.
/// </summary>
public interface IUserService
{
    Task<GetCurrentUserResponse> GetCurrentUserAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Update the user's privacy/sharing preferences (partial patch).</summary>
    Task<GetCurrentUserResponse> UpdateSettingsAsync(Guid userId, UpdateUserSettingsRequest request, CancellationToken ct = default);

    /// <summary>Get the partner's presence, honouring their "Share activity" preference.</summary>
    Task<PartnerStatusResponse> GetPartnerStatusAsync(Guid userId, CancellationToken ct = default);
}
