using Amori.Api.Features.Vault.DTOs;

namespace Amori.Api.Features.Vault.Services;

/// <summary>
/// The Hearth Vault — each user's private collection of saved daily gifts.
///
/// Every method is scoped to the <paramref name="userId"/> it is given: one
/// partner's vault is invisible to the other, which is the whole point of the
/// feature. There is deliberately no relationship-wide read.
/// </summary>
public interface IVaultService
{
    Task<IReadOnlyList<VaultGiftResponse>> GetGiftsAsync(Guid userId, CancellationToken ct = default);
    Task<VaultGiftResponse> GetGiftByIdAsync(Guid userId, Guid giftId, CancellationToken ct = default);
    Task<VaultGiftResponse> SaveGiftAsync(Guid userId, SaveVaultGiftRequest request, CancellationToken ct = default);

    /// <summary>
    /// Send a memory as a gift into the caller's PARTNER's vault, and notify
    /// them. Unlike <see cref="SaveGiftAsync"/> (which saves to the caller's own
    /// vault), the created gift is owned by the partner. The caller can't read
    /// the partner's vault, so this returns a lightweight confirmation rather
    /// than the saved gift itself.
    /// </summary>
    Task<SendGiftResult> SendGiftToPartnerAsync(Guid userId, SaveVaultGiftRequest request, CancellationToken ct = default);

    Task RemoveGiftAsync(Guid userId, Guid giftId, CancellationToken ct = default);
}
