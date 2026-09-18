using Amori.Api.Features.Distraction.DTOs;

namespace Amori.Api.Features.Distraction.Services;

/// <summary>
/// Couple-authored "spot the hidden object" image puzzles.
/// </summary>
public interface IHiddenObjectService
{
    Task<IReadOnlyList<HiddenObjectPuzzleResponse>> GetPuzzlesAsync(Guid userId, CancellationToken ct = default);
    Task<HiddenObjectPuzzleResponse> CreatePuzzleAsync(Guid userId, CreateHiddenObjectPuzzleRequest request, CancellationToken ct = default);
    Task DeletePuzzleAsync(Guid userId, Guid puzzleId, CancellationToken ct = default);
}
