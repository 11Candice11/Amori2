//
//  MoodTheme.swift
//  Maps a backend MoodType label (and optional feeling label) to a colour and
//  glyph for display in the widget. Mirrors the app's valence×arousal quadrant
//  model so the widget reads consistently with the in-app mood surfaces.
//
//  Member of BOTH the "Amori" app target and the "AmoriWidgets" extension.
//

import SwiftUI

public struct MoodDisplay {
    public let color: Color
    public let glyph: String
    public let quadrantLabel: String
}

public enum MoodTheme {
    /// Resolve a display treatment from a backend MoodType label such as
    /// "Calm", "Anxious", "Happy". Falls back to a neutral treatment.
    public static func display(for mood: String) -> MoodDisplay {
        switch mood.lowercased() {
        // High energy · pleasant (yellow)
        case "happy":
            return MoodDisplay(color: Color(red: 0.98, green: 0.78, blue: 0.24),
                               glyph: "sun.max.fill",
                               quadrantLabel: "High Energy · Pleasant")
        // Low energy · pleasant (green)
        case "calm":
            return MoodDisplay(color: Color(red: 0.42, green: 0.73, blue: 0.51),
                               glyph: "leaf.fill",
                               quadrantLabel: "Low Energy · Pleasant")
        // High energy · unpleasant (red)
        case "anxious", "angry", "overwhelmed":
            return MoodDisplay(color: Color(red: 0.90, green: 0.36, blue: 0.36),
                               glyph: "bolt.fill",
                               quadrantLabel: "High Energy · Unpleasant")
        // Low energy · unpleasant (blue)
        case "sad", "numb":
            return MoodDisplay(color: Color(red: 0.40, green: 0.55, blue: 0.82),
                               glyph: "cloud.fill",
                               quadrantLabel: "Low Energy · Unpleasant")
        default:
            return MoodDisplay(color: Color(red: 0.60, green: 0.60, blue: 0.66),
                               glyph: "circle.dashed",
                               quadrantLabel: "Mood")
        }
    }

    /// A short "time ago" caption from an ISO-8601 timestamp.
    public static func relativeCaption(fromISO iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: iso)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: iso)
        }
        guard let date = date else { return "" }
        let relative = RelativeDateTimeFormatter()
        relative.unitsStyle = .short
        return relative.localizedString(for: date, relativeTo: Date())
    }
}
