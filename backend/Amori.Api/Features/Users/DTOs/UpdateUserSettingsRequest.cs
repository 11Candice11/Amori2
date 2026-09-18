namespace Amori.Api.Features.Users.DTOs;

/// <summary>
/// Patch request for the user's privacy/sharing preferences. Only the fields
/// that are provided (non-null) are updated.
/// </summary>
public sealed class UpdateUserSettingsRequest
{
    /// <summary>Share mood check-ins with the partner.</summary>
    public bool? ShareMood { get; set; }

    /// <summary>Share activity/presence (online) with the partner.</summary>
    public bool? ShareActivity { get; set; }
}
