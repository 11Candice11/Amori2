using Amori.Api.Features.Splitting;
using Amori.Api.Features.Splitting.DTOs;

namespace Amori.Api.Features.Splitting.Services;

/// <summary>
/// Business logic for the "I'm splitting" emotional grounding flow.
/// </summary>
public interface ISplittingService
{
    Task<SplittingSessionResponse> CreateAsync(Guid userId, CreateSplittingSessionRequest request, CancellationToken ct = default);
    Task<SplittingSessionResponse> GetByIdAsync(Guid userId, Guid sessionId, CancellationToken ct = default);
    Task<IReadOnlyList<SplittingSessionResponse>> GetAllAsync(Guid userId, CancellationToken ct = default);
    Task<SplittingSessionResponse> UpdateAsync(Guid userId, Guid sessionId, UpdateSplittingSessionRequest request, CancellationToken ct = default);
    Task<SplittingSessionResponse> CompleteAsync(Guid userId, Guid sessionId, CompleteSplittingSessionRequest request, CancellationToken ct = default);
    Task<SplittingSessionResponse> CancelAsync(Guid userId, Guid sessionId, CancellationToken ct = default);

    /// <summary>
    /// Privacy-safe view of the partner's active (in-progress) grounding
    /// session, if any, so the caller can see a shared self-regulation window.
    /// Returns null when the partner has no active session.
    /// </summary>
    Task<PartnerSplittingWindowResponse?> GetPartnerActiveAsync(Guid userId, CancellationToken ct = default);
}
