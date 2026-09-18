namespace Amori.Api.Domain.Entities;

/// <summary>
/// A "spot the hidden object" puzzle authored by one partner for the other:
/// an image plus the location of the thing to find. Coordinates are stored
/// normalised (0–1) relative to the image so they render on any screen size.
/// </summary>
public sealed class HiddenObjectPuzzle : BaseEntity
{
    public Guid RelationshipId { get; set; }
    public Guid CreatedByUserId { get; set; }

    /// <summary>Storage key/URL for the puzzle image (client uploads first, sends the key).</summary>
    public string ImageFileKey { get; set; } = string.Empty;

    /// <summary>What the player is looking for, e.g. "the hidden heart".</summary>
    public string Prompt { get; set; } = string.Empty;

    /// <summary>Normalised target centre (0–1) within the image.</summary>
    public double TargetX { get; set; }
    public double TargetY { get; set; }

    /// <summary>Hit tolerance as a fraction of image size (0–1). Defaults to a forgiving 0.08.</summary>
    public double TargetRadius { get; set; } = 0.08;

    public bool IsActive { get; set; } = true;

    // Navigation
    public Relationship Relationship { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
}
