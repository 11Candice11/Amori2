using Amori.Api.Features.WeeklyReflection.DTOs;

namespace Amori.Api.Features.WeeklyReflection.Services;

/// <summary>
/// Kept weekly reflections — each user's private archive of frozen weekly
/// retrospectives.
///
/// Every method is scoped to the <paramref name="userId"/> it is given: one
/// partner's archive is invisible to the other, exactly like the Hearth Vault.
/// There is deliberately no relationship-wide read.
/// </summary>
public interface IWeeklyReflectionArchiveService
{
    /// <summary>The caller's kept reflections, newest week first.</summary>
    Task<IReadOnlyList<WeeklyReflectionArchiveResponse>> GetAllAsync(Guid userId, CancellationToken ct = default);

    /// <summary>A single kept reflection by its week key. 404 if not kept.</summary>
    Task<WeeklyReflectionArchiveResponse> GetByWeekKeyAsync(Guid userId, string weekKey, CancellationToken ct = default);

    /// <summary>
    /// Save the caller's reflection for a week. Idempotent per week: re-saving
    /// the same <c>WeekKey</c> overwrites that week's snapshot in place.
    /// </summary>
    Task<WeeklyReflectionArchiveResponse> SaveAsync(Guid userId, SaveWeeklyReflectionRequest request, CancellationToken ct = default);

    /// <summary>Remove a kept reflection. 404 if it isn't in the caller's archive.</summary>
    Task RemoveAsync(Guid userId, string weekKey, CancellationToken ct = default);
}
