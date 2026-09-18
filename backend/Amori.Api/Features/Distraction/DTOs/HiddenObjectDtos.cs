namespace Amori.Api.Features.Distraction.DTOs;

// ─── Responses ────────────────────────────────────────────────────────────────

public sealed class HiddenObjectPuzzleResponse
{
    public Guid Id { get; init; }
    /// <summary>Opaque storage key (persisted).</summary>
    public string ImageFileKey { get; init; } = string.Empty;
    /// <summary>A loadable image URL resolved from the key (may be presigned / time-limited).</summary>
    public string ImageUrl { get; init; } = string.Empty;
    public string Prompt { get; init; } = string.Empty;
    public double TargetX { get; init; }
    public double TargetY { get; init; }
    public double TargetRadius { get; init; }
    public Guid CreatedByUserId { get; init; }
    public string? CreatedByName { get; init; }
    /// <summary>True when the current user authored this puzzle (so the UI can hide the answer).</summary>
    public bool IsMine { get; init; }
    public DateTime CreatedAt { get; init; }
}

// ─── Requests ─────────────────────────────────────────────────────────────────

/// <summary>
/// A partner authoring a hidden-object puzzle for the other. The image is
/// uploaded to storage first; the client sends the resulting key/URL plus the
/// normalised (0–1) location of the thing to find.
/// </summary>
public sealed class CreateHiddenObjectPuzzleRequest
{
    public string ImageFileKey { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public double TargetX { get; set; }
    public double TargetY { get; set; }
    public double? TargetRadius { get; set; }
}
