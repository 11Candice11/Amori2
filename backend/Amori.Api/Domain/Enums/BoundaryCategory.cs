namespace Amori.Api.Domain.Enums;

/// <summary>
/// Stable identifiers for the "My Boundaries" categories. Each category holds
/// three lists (comfortable-with / ask-before / please-don't) and its own
/// per-category privacy. Serialized by name.
/// </summary>
public enum BoundaryCategory
{
    Communication = 1,
    PersonalSpace = 2,
    PhysicalAffection = 3,
    Social = 4,
    TimeTogether = 5,
    Conflict = 6,
    Privacy = 7,
}
