using Amori.Api.Domain.ValueObjects;

namespace Amori.Api.Domain.Entities;

/// <summary>
/// A personal "Support Preferences" / "How to Know Me" profile owned by a single
/// user. It is authored entirely by its owner; the linked partner can read only
/// the fields the owner marked Shared, via the partner-facing endpoint.
///
/// The seven sections are stored as individual jsonb columns (see
/// <c>SupportProfileConfiguration</c>) rather than as many relational tables —
/// each section is a self-contained value object that can be updated on its own.
/// Every field carries its own <see cref="Enums.FieldVisibility"/>, and privacy
/// is enforced in the service layer: partner projections copy across only Shared
/// fields, so a Private field never leaves the server.
///
/// This profile is static, owner-authored data. Nothing here is inferred from
/// mood/incident history, and reading it must never auto-trigger an action.
/// </summary>
public sealed class SupportProfile : BaseEntity
{
    /// <summary>The owner. Exactly one profile per user (unique index).</summary>
    public Guid UserId { get; set; }

    public WhoIAmSection WhoIAm { get; set; } = new();
    public WhatILikeSection WhatILike { get; set; } = new();
    public FavoritesSection Favorites { get; set; } = new();
    public HowToHelpMeSection HowToHelpMe { get; set; } = new();
    public ThingsToKnowSection ThingsToKnow { get; set; } = new();
    public BoundariesSection Boundaries { get; set; } = new();
    public LittleThingsSection LittleThings { get; set; } = new();

    // Navigation
    public User User { get; set; } = null!;
}
