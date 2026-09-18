using Amori.Api.Features.Relationships.DTOs;

namespace Amori.Api.Features.Relationships.Services;

/// <summary>
/// Handles linking two user accounts into a single couple relationship via
/// email-based link requests (backed by <c>RelationshipInvitation</c>).
/// </summary>
public interface IPartnerLinkService
{
    /// <summary>
    /// Current linking status for the user: whether they're linked to a real
    /// partner, plus any pending incoming/outgoing link requests.
    /// </summary>
    Task<PartnerLinkStatusResponse> GetStatusAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Send a link request to the account with the given email.
    /// </summary>
    Task<PartnerLinkRequestResponse> SendRequestAsync(Guid userId, SendPartnerLinkRequest request, CancellationToken ct = default);

    /// <summary>
    /// Accept an incoming link request, merging both users into one relationship.
    /// An optional start date seeds the relationship's anniversary.
    /// </summary>
    Task<RelationshipResponse> AcceptRequestAsync(Guid userId, Guid requestId, AcceptPartnerLinkRequest request, CancellationToken ct = default);

    /// <summary>
    /// Decline an incoming link request.
    /// </summary>
    Task DeclineRequestAsync(Guid userId, Guid requestId, CancellationToken ct = default);

    /// <summary>
    /// Cancel an outgoing link request the user previously sent.
    /// </summary>
    Task CancelRequestAsync(Guid userId, Guid requestId, CancellationToken ct = default);

    /// <summary>
    /// Unlink the user from their current partner. The user is moved to a fresh
    /// solo relationship so their own data continues to have a home, while the
    /// shared relationship (and its data) stays with the partner.
    /// </summary>
    Task UnlinkAsync(Guid userId, CancellationToken ct = default);
}
