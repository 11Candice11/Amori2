//
//  AmoriSharedStore.swift
//  Shared between the Amori app and the AmoriWidgets extension.
//
//  The main app writes small snapshots (partner mood, splitting window) into a
//  shared App Group container. The widget extension reads those snapshots to
//  render the home-screen widget. Keep this file a member of BOTH targets:
//  the "Amori" app target and the "AmoriWidgets" extension target.
//

import Foundation

/// App Group identifier. Must match the App Group capability enabled on BOTH
/// the app target and the widget extension target, and the `com.apple.security
/// .application-groups` entitlement in each target's .entitlements file.
public enum AmoriAppGroup {
    public static let identifier = "group.com.candice.amori"
}

/// Storage keys used inside the shared UserDefaults suite.
private enum StoreKey {
    static let partnerMood = "amori.partnerMood.v1"
}

/// A privacy-safe snapshot of the partner's most recent shared mood check-in.
/// Mirrors the fields the JS `DashboardPartnerMood` exposes, kept intentionally
/// small — no free text beyond the chosen feeling label.
public struct PartnerMoodSnapshot: Codable, Equatable {
    /// Backend MoodType label, e.g. "Calm".
    public let mood: String
    /// Human-readable feeling the partner chose, e.g. "Content" (may be nil).
    public let feelings: String?
    /// Partner's display name (first name only), for the widget caption.
    public let partnerName: String?
    /// ISO-8601 timestamp of the partner's check-in.
    public let updatedAt: String

    public init(mood: String, feelings: String?, partnerName: String?, updatedAt: String) {
        self.mood = mood
        self.feelings = feelings
        self.partnerName = partnerName
        self.updatedAt = updatedAt
    }
}

/// Reads/writes the shared snapshots in the App Group container.
public enum AmoriSharedStore {
    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: AmoriAppGroup.identifier)
    }

    // MARK: Partner mood

    public static func savePartnerMood(_ snapshot: PartnerMoodSnapshot?) {
        guard let defaults = defaults else { return }
        if let snapshot = snapshot, let data = try? JSONEncoder().encode(snapshot) {
            defaults.set(data, forKey: StoreKey.partnerMood)
        } else {
            defaults.removeObject(forKey: StoreKey.partnerMood)
        }
    }

    public static func loadPartnerMood() -> PartnerMoodSnapshot? {
        guard let defaults = defaults,
              let data = defaults.data(forKey: StoreKey.partnerMood) else {
            return nil
        }
        return try? JSONDecoder().decode(PartnerMoodSnapshot.self, from: data)
    }
}
