namespace Amori.Api.Features.Users.DTOs;

public sealed class GetCurrentUserResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    /// <summary>Privacy: share mood check-ins with the partner. </summary>
    public bool ShareMood { get; set; } = true;

    /// <summary>Privacy: share activity/presence (online) with the partner. </summary>
    public bool ShareActivity { get; set; } = true;
}
