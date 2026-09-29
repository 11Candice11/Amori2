//
//  SplittingLiveActivity.swift
//  Live Activity UI for the splitting self-regulation countdown. Renders on the
//  Lock Screen and in the Dynamic Island, ticking down to `endsAt` on its own.
//
//  Member of the "AmoriWidgets" extension target only.
//

import ActivityKit
import WidgetKit
import SwiftUI

@available(iOS 16.1, *)
struct SplittingLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SplittingActivityAttributes.self) { context in
            // Lock Screen / banner presentation.
            LockScreenCountdownView(
                state: context.state,
                partnerName: context.attributes.partnerName
            )
            .activityBackgroundTint(AmoriPalette.background.opacity(0.92))
            .activitySystemActionForegroundColor(AmoriPalette.primaryLight)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label {
                        Text(captionTitle(for: context.state, partnerName: context.attributes.partnerName))
                            .font(.caption).fontWeight(.medium)
                    } icon: {
                        Image(systemName: "wind")
                            .foregroundStyle(AmoriPalette.primaryLight)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    countdownText(for: context.state)
                        .font(.system(.title3, design: .rounded)).monospacedDigit()
                        .fontWeight(.semibold)
                        .foregroundStyle(AmoriPalette.gold)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Taking space to settle. There's no rush.")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            } compactLeading: {
                Image(systemName: "wind").foregroundStyle(AmoriPalette.primaryLight)
            } compactTrailing: {
                countdownText(for: context.state)
                    .font(.caption).monospacedDigit()
                    .foregroundStyle(AmoriPalette.gold)
                    .frame(maxWidth: 56)
            } minimal: {
                Image(systemName: "wind").foregroundStyle(AmoriPalette.primaryLight)
            }
            .keylineTint(AmoriPalette.primaryLight)
        }
    }
}

// MARK: - Lock Screen view

@available(iOS 16.1, *)
private struct LockScreenCountdownView: View {
    let state: SplittingActivityAttributes.ContentState
    let partnerName: String?

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .stroke(AmoriPalette.primaryLight.opacity(0.22), lineWidth: 5)
                if !state.finished {
                    // Elapsed-progress ring toward the window end.
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(AmoriPalette.primaryLight, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                }
                Image(systemName: state.finished ? "checkmark" : "wind")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AmoriPalette.primaryLight)
            }
            .frame(width: 46, height: 46)

            VStack(alignment: .leading, spacing: 3) {
                Text(captionTitle(for: state, partnerName: partnerName))
                    .font(.subheadline).fontWeight(.semibold)
                    .foregroundStyle(AmoriPalette.neutral)
                Text(state.finished ? "Space complete" : "Taking space to settle")
                    .font(.caption2)
                    .foregroundStyle(AmoriPalette.neutralMuted)
            }

            Spacer(minLength: 0)

            countdownText(for: state)
                .font(.system(.title2, design: .rounded)).monospacedDigit()
                .fontWeight(.bold)
                .foregroundStyle(AmoriPalette.gold)
        }
        .padding(16)
    }

    private var progress: CGFloat {
        let total = state.endsAt.timeIntervalSince(state.startedAt)
        guard total > 0 else { return 1 }
        let elapsed = Date().timeIntervalSince(state.startedAt)
        return CGFloat(min(max(elapsed / total, 0), 1))
    }
}

// MARK: - Shared helpers

@available(iOS 16.1, *)
private func captionTitle(
    for state: SplittingActivityAttributes.ContentState,
    partnerName: String?
) -> String {
    if state.owner == "partner" {
        let name = partnerName ?? "Your partner"
        return "\(name) is taking space"
    }
    return "You're taking space"
}

@available(iOS 16.1, *)
@ViewBuilder
private func countdownText(for state: SplittingActivityAttributes.ContentState) -> some View {
    if state.finished || state.endsAt <= Date() {
        Text("Done")
    } else {
        // A self-updating countdown rendered by the system.
        Text(timerInterval: Date()...state.endsAt, countsDown: true)
            .multilineTextAlignment(.trailing)
    }
}
