//
//  SplittingActivityAttributes.swift
//  ActivityKit attributes for the "self-regulation window" (splitting) Live
//  Activity countdown. Shared between the "Amori" app target (which starts /
//  updates / ends the activity) and the "AmoriWidgets" extension target (which
//  renders it on the Lock Screen and in the Dynamic Island).
//
//  Member of BOTH targets.
//

import ActivityKit
import Foundation

@available(iOS 16.1, *)
public struct SplittingActivityAttributes: ActivityAttributes {
    public typealias ContentState = SplittingContentState

    /// Dynamic state pushed as the window progresses. Live Activities render a
    /// self-updating countdown from a target `Date`, so the OS ticks the timer
    /// down without the app being foregrounded.
    public struct SplittingContentState: Codable, Hashable {
        /// When the self-regulation window ends. WidgetKit renders a live
        /// countdown to this date via `Text(timerInterval:)`.
        public var endsAt: Date
        /// When the window started — used to draw the elapsed/remaining ring.
        public var startedAt: Date
        /// Whether this window belongs to the current user ("self") or their
        /// partner ("partner"). Controls the caption wording.
        public var owner: String
        /// Whether the window has been marked finished early (e.g. ended by the
        /// user). When true the UI shows a "complete" state instead of a timer.
        public var finished: Bool

        public init(endsAt: Date, startedAt: Date, owner: String, finished: Bool) {
            self.endsAt = endsAt
            self.startedAt = startedAt
            self.owner = owner
            self.finished = finished
        }
    }

    /// Static attributes fixed for the life of the activity.
    /// Partner's display name, for the "giving <name> space" caption.
    public var partnerName: String?

    public init(partnerName: String?) {
        self.partnerName = partnerName
    }
}
