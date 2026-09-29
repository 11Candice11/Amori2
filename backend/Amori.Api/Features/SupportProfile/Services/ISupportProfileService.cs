using Amori.Api.Features.SupportProfile.DTOs;

namespace Amori.Api.Features.SupportProfile.Services;

/// <summary>
/// Business logic for the owner-authored "Support Preferences" / "How to Know
/// Me" profile. Privacy is enforced here: partner projections include only
/// fields the owner marked Shared.
/// </summary>
public interface ISupportProfileService
{
    /// <summary>
    /// The caller's own profile, creating an empty one on first access so the
    /// client always has a stable shape to edit.
    /// </summary>
    Task<SupportProfileResponse> GetMineAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Apply a multi-section partial update to the caller's profile.</summary>
    Task<SupportProfileResponse> UpdateMineAsync(Guid userId, UpdateSupportProfileRequest request, CancellationToken ct = default);

    // Section-scoped partial updates (PATCH /me/{section}).
    Task<SupportProfileResponse> UpdateWhoIAmAsync(Guid userId, UpdateWhoIAmRequest request, CancellationToken ct = default);
    Task<SupportProfileResponse> UpdateWhatILikeAsync(Guid userId, UpdateWhatILikeRequest request, CancellationToken ct = default);
    Task<SupportProfileResponse> UpdateFavoritesAsync(Guid userId, UpdateFavoritesRequest request, CancellationToken ct = default);
    Task<SupportProfileResponse> UpdateHowToHelpMeAsync(Guid userId, UpdateHowToHelpMeRequest request, CancellationToken ct = default);
    Task<SupportProfileResponse> UpdateThingsToKnowAsync(Guid userId, UpdateThingsToKnowRequest request, CancellationToken ct = default);
    Task<SupportProfileResponse> UpdateBoundariesAsync(Guid userId, UpdateBoundariesRequest request, CancellationToken ct = default);
    Task<SupportProfileResponse> UpdateLittleThingsAsync(Guid userId, UpdateLittleThingsRequest request, CancellationToken ct = default);

    /// <summary>
    /// The linked partner's profile, filtered to shared, non-empty fields only.
    /// Throws NotFound when the caller has no linked partner.
    /// </summary>
    Task<PartnerSupportProfileResponse> GetPartnerAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Send the linked partner a single "I updated my profile" notification.
    /// Only ever called on an explicit user action — never automatically.
    /// </summary>
    Task NotifyPartnerAsync(Guid userId, NotifyPartnerRequest request, CancellationToken ct = default);
}
