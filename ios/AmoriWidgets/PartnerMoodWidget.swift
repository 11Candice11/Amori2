//
//  PartnerMoodWidget.swift
//  Home-screen widget showing the partner's most recent shared mood.
//  Reads a PartnerMoodSnapshot from the App Group shared store.
//
//  Member of the "AmoriWidgets" extension target only.
//

import WidgetKit
import SwiftUI

// MARK: - Timeline entry

struct PartnerMoodEntry: TimelineEntry {
    let date: Date
    let snapshot: PartnerMoodSnapshot?
}

// MARK: - Provider

struct PartnerMoodProvider: TimelineProvider {
    func placeholder(in context: Context) -> PartnerMoodEntry {
        PartnerMoodEntry(
            date: Date(),
            snapshot: PartnerMoodSnapshot(
                mood: "Calm", feelings: "Content", partnerName: "Alex",
                updatedAt: ISO8601DateFormatter().string(from: Date())
            )
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (PartnerMoodEntry) -> Void) {
        completion(PartnerMoodEntry(date: Date(), snapshot: AmoriSharedStore.loadPartnerMood()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PartnerMoodEntry>) -> Void) {
        let entry = PartnerMoodEntry(date: Date(), snapshot: AmoriSharedStore.loadPartnerMood())
        // The app refreshes the timeline (WidgetCenter.reloadTimelines) whenever
        // the partner's mood changes; also re-poll periodically so the relative
        // "time ago" caption stays fresh.
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - View

struct PartnerMoodWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PartnerMoodEntry

    var body: some View {
        if let snapshot = entry.snapshot {
            content(for: snapshot)
        } else {
            emptyState
        }
    }

    @ViewBuilder
    private func content(for snapshot: PartnerMoodSnapshot) -> some View {
        let display = MoodTheme.display(for: snapshot.mood)
        let name = snapshot.partnerName ?? "Your partner"
        let feeling = snapshot.feelings ?? snapshot.mood

        VStack(alignment: .leading, spacing: family == .systemSmall ? 6 : 8) {
            HStack(spacing: 8) {
                // Mood glyph sits in a tinted chip so the mood colour reads as
                // an accent against the dark green background.
                Image(systemName: display.glyph)
                    .font(.system(size: family == .systemSmall ? 16 : 20, weight: .semibold))
                    .foregroundStyle(display.color)
                    .padding(family == .systemSmall ? 7 : 9)
                    .background(display.color.opacity(0.18), in: Circle())
                Spacer(minLength: 0)
            }

            Spacer(minLength: 0)

            Text(feeling)
                .font(family == .systemSmall ? .headline : .title2)
                .fontWeight(.semibold)
                .foregroundStyle(AmoriPalette.neutral)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text("\(name) · \(MoodTheme.relativeCaption(fromISO: snapshot.updatedAt))")
                .font(.caption2)
                .foregroundStyle(AmoriPalette.neutralMuted)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(family == .systemSmall ? 12 : 16)
        .containerBackground(for: .widget) { botanicalBackground(accent: display.color) }
    }

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: "leaf.fill")
                .font(.title3)
                .foregroundStyle(AmoriPalette.primaryLight)
            Spacer(minLength: 0)
            Text("No mood shared yet")
                .font(.subheadline).fontWeight(.medium)
                .foregroundStyle(AmoriPalette.neutral)
            Text("When your partner checks in, it shows here.")
                .font(.caption2)
                .foregroundStyle(AmoriPalette.neutralMuted)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(12)
        .containerBackground(for: .widget) { botanicalBackground(accent: AmoriPalette.primary) }
    }

    /// The app's dark botanical green background, with a faint mood-coloured
    /// wash in the top-leading corner so each mood still tints the card subtly.
    private func botanicalBackground(accent: Color) -> some View {
        ZStack {
            LinearGradient(
                colors: [AmoriPalette.surfaceCard, AmoriPalette.background, AmoriPalette.secondary],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            RadialGradient(
                colors: [accent.opacity(0.20), .clear],
                center: .topLeading,
                startRadius: 0,
                endRadius: 140
            )
        }
    }
}

// MARK: - Widget

struct PartnerMoodWidget: Widget {
    let kind = "PartnerMoodWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PartnerMoodProvider()) { entry in
            PartnerMoodWidgetView(entry: entry)
        }
        .configurationDisplayName("Partner Mood")
        .description("See how your partner is feeling at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
