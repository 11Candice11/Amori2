namespace Amori.Api.Features.Relationships.DTOs;

/// <summary>Request to link with a partner, identified by their account email.</summary>
public sealed class SendPartnerLinkRequest
{
    public string Email { get; set; } = string.Empty;
}

/// <summary>Options supplied when accepting an incoming link request.</summary>
public sealed class AcceptPartnerLinkRequest
{
    /// <summary>
    /// The date the relationship began, used to seed "days together" on the
    /// dashboard. Optional — when null the relationship has no anniversary set.
    /// </summary>
    public DateOnly? StartDate { get; set; }
}

/// <summary>Direction of a partner link request relative to the current user.</summary>
public enum PartnerLinkDirection
{
    /// <summary>The current user sent this request.</summary>
    Outgoing = 1,
    /// <summary>The current user received this request.</summary>
    Incoming = 2
}

/// <summary>A pending partner link request visible to the current user.</summary>
public sealed class PartnerLinkRequestResponse
{
    public Guid Id { get; set; }
    public PartnerLinkDirection Direction { get; set; }

    /// <summary>The other person's display name, if we could resolve their account.</summary>
    public string? OtherPartyName { get; set; }

    /// <summary>The other person's email.</summary>
    public string OtherPartyEmail { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}

/// <summary>
/// The current user's partner-link status: whether they're already linked,
/// plus any pending incoming/outgoing requests.
/// </summary>
public sealed class PartnerLinkStatusResponse
{
    /// <summary>True when the user shares a relationship with a real partner.</summary>
    public bool IsLinked { get; set; }

    /// <summary>The linked partner's display name, when linked.</summary>
    public string? PartnerName { get; set; }

    public IReadOnlyList<PartnerLinkRequestResponse> IncomingRequests { get; set; } = [];
    public IReadOnlyList<PartnerLinkRequestResponse> OutgoingRequests { get; set; } = [];
}
