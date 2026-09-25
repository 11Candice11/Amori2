namespace Amori.Api.Features.Auth.DTOs;

public sealed class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Long-lived refresh token. The client stores this and exchanges it at
    /// /api/auth/refresh for a new access token when the access token expires,
    /// so the user stays signed in until they explicitly sign out.
    /// </summary>
    public string RefreshToken { get; set; } = string.Empty;

    /// <summary>UTC instant at which the access token expires.</summary>
    public DateTime AccessTokenExpiresAt { get; set; }

    public UserResponse User { get; set; } = null!;
}

public sealed class UserResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}
