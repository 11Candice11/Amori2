namespace Amori.Api.Features.Auth.DTOs;

/// <summary>
/// Exchanges a valid refresh token for a fresh access + refresh token pair.
/// </summary>
public sealed class RefreshRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}
