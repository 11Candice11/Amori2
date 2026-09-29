namespace Amori.Api.Domain.Enums;

/// <summary>
/// The guided "Let's Chat" sentence templates a user can choose from. Numbered
/// from 1 so the stored int is stable while the wire format (via the global
/// JsonStringEnumConverter) is the string name — the mobile client relies on the
/// string form being consistent (see ChatMessageStatus).
/// </summary>
public enum ChatTemplateType
{
    Feeling = 1,
    Appreciation = 2,
    Need = 3,
    SomethingBotheredMe = 4,
    SomethingOnMyMind = 5,
    Future = 6,
}
