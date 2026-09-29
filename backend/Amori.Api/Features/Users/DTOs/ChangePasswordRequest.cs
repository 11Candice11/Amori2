namespace Amori.Api.Features.Users.DTOs;

/// <summary>
/// Request to change the signed-in user's password. The current password is
/// required so a stolen session can't silently reset the password.
/// </summary>
public sealed class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
