namespace Amori.Api.Features.Users.DTOs;

/// <summary>
/// The partner's presence, honouring their "Share activity" preference.
/// </summary>
public sealed class PartnerStatusResponse
{
    public bool IsLinked { get; set; }
    public bool IsOnline { get; set; }

    /// <summary>Null when the partner has opted out of sharing activity.</summary>
    public DateTime? LastActiveAt { get; set; }
}
