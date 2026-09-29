namespace Amori.Api.Domain.Enums;

/// <summary>
/// Stable identifiers for the "How to Help Me" default support options.
///
/// These are persisted and exchanged as their string names (the API registers
/// a global <c>JsonStringEnumConverter</c>), never as display text — so the UI
/// wording can change without a data migration. Owners may additionally record
/// free-form custom responses alongside these (see
/// <c>HowToHelpMeSection.CustomOptions</c>).
///
/// The support profile is a static, owner-authored preference. Amori must never
/// infer or auto-select any of these from mood or incident history, and must
/// never auto-trigger an action (e.g. a space request) from them.
/// </summary>
public enum SupportPreferenceOption
{
    GiveSpace = 1,
    StayClose = 2,
    Reassure = 3,
    Listen = 4,
    HelpSolve = 5,
    Distract = 6,
    MakeMeLaugh = 7,
    PhysicalAffection = 8,
    CheckInLater = 9,
    AskWhatINeed = 10,
}
