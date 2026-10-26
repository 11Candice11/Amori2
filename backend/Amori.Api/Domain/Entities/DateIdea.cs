using Amori.Api.Domain.Enums;

namespace Amori.Api.Domain.Entities;

public sealed class DateIdea : BaseEntity
{
    public Guid RelationshipId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Storage key for the idea's photo (uploaded via /api/media). Null when none.</summary>
    public string? ImageKey { get; set; }

    /// <summary>An optional web page for the idea (a venue, a recipe, a booking page). http(s) only.</summary>
    public string? Url { get; set; }

    public DateCategory Category { get; set; }
    public string? Location { get; set; }
    public decimal? EstimatedCost { get; set; }
    public int? DurationMinutes { get; set; }
    public string? Notes { get; set; }
    public bool IsFavorite { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Navigation
    public Relationship Relationship { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
}
