using Amori.Api.Features.Auth.DTOs;

namespace Amori.Api.Features.Auth.Services;

/// <summary>
/// Core authentication business logic — register, login, refresh, and logout.
/// </summary>
public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);

    /// <summary>
    /// Exchanges a valid, non-revoked refresh token for a new access + refresh
    /// token pair, rotating the refresh token in the process.
    /// </summary>
    Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct = default);

    /// <summary>Revokes the supplied refresh token so the session can no longer be renewed.</summary>
    Task LogoutAsync(RefreshRequest request, CancellationToken ct = default);
}
