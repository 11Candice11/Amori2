namespace Amori.Api.Domain.Enums;

/// <summary>
/// Per-field privacy on a Support Profile. Every field the owner fills in
/// carries one of these so the owner controls, field by field, what their
/// linked partner may see.
///
/// The partner-facing endpoint filters strictly on this value server-side:
/// only <see cref="Shared"/> fields are ever serialized into a partner
/// response — a <see cref="Private"/> field is never returned, so privacy
/// does not depend on the client hiding anything.
/// </summary>
public enum FieldVisibility
{
    /// <summary>Visible to the linked partner via the partner endpoint.</summary>
    Shared = 1,

    /// <summary>Owner-only. Never returned by any partner-facing query.</summary>
    Private = 2,
}
