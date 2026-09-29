//
//  MoodTheme.swift
//  Maps a backend MoodType label (and optional feeling label) to a colour and
//  glyph for display in the widget. Mirrors the app's valence×arousal quadrant
//  model so the widget reads consistently with the in-app mood surfaces.
//
//  Member of BOTH the "Amori" app target and the "AmoriWidgets" extension.
//

import SwiftUI

/// Amori's botanical dark theme palette, mirrored from src/theme/colors.ts
/// (darkPalette) so the widget matches the in-app dark green look.
public enum AmoriPalette {
    /// Near-black botanical green — app background / surface (#0A140F).
    public static let background = Color(red: 0x0A / 255, green: 0x14 / 255, blue: 0x0F / 255)
    /// Slightly lifted card surface (#111D16).
    public static let surfaceCard = Color(red: 0x11 / 255, green: 0x1D / 255, blue: 0x16 / 255)
    /// Deep brand green (#064E3B).
    public static let primary = Color(red: 0x06 / 255, green: 0x4E / 255, blue: 0x3B / 255)
    /// Darkest green (#022C22) — used for gradient depth.
    public static let secondary = Color(red: 0x02 / 255, green: 0x2C / 255, blue: 0x22 / 255)
    /// Soft sage green (#A7D2B6) — light primary accent.
    public static let primaryLight = Color(red: 0xA7 / 255, green: 0xD2 / 255, blue: 0xB6 / 255)
    /// Gold accent (#C5A365).
    public static let gold = Color(red: 0xC5 / 255, green: 0xA3 / 255, blue: 0x65 / 255)
    /// Warm off-white primary text (#FDFCF0).
    public static let neutral = Color(red: 0xFD / 255, green: 0xFC / 255, blue: 0xF0 / 255)
    /// Muted text (neutral @ 64%).
    public static let neutralMuted = Color(red: 0xFD / 255, green: 0xFC / 255, blue: 0xF0 / 255).opacity(0.64)
    /// Subtle text (neutral @ 38%).
    public static let neutralSubtle = Color(red: 0xFD / 255, green: 0xFC / 255, blue: 0xF0 / 255).opacity(0.38)
    /// Hairline border (neutral @ 8%).
    public static let border = Color(red: 0xFD / 255, green: 0xFC / 255, blue: 0xF0 / 255).opacity(0.08)
}

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
