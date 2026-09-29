//
//  AmoriWidgetBridge.swift
//  React Native bridge exposing the home-screen widget refresh and the
//  splitting-countdown Live Activity lifecycle to JavaScript.
//
//  Member of the "Amori" app target only. The paired Obj-C interface in
//  AmoriWidgetBridge.m registers the methods with the RN bridge.
//
//  JS-facing module name: "AmoriWidgetBridge".
//

import Foundation
import WidgetKit
import ActivityKit
import React

@objc(AmoriWidgetBridge)
final class AmoriWidgetBridge: NSObject {

    /// Bridge work touches WidgetCenter / ActivityKit; keep it off the JS thread.
    @objc static func requiresMainQueueSetup() -> Bool { false }

    // Tracks the currently running splitting Live Activity so update/end can
    // find it without the caller holding a token. Only one runs at a time.
    private var currentActivityID: String?

    // MARK: - Partner mood widget

    /// Persist the partner's latest shared mood and refresh the widget timeline.
    /// Pass an empty/absent `mood` to clear the widget.
    @objc(setPartnerMood:resolver:rejecter:)
    func setPartnerMood(
        _ payload: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let mood = payload["mood"] as? String
        if let mood = mood, !mood.isEmpty {
            let snapshot = PartnerMoodSnapshot(
                mood: mood,
                feelings: payload["feelings"] as? String,
                partnerName: payload["partnerName"] as? String,
                updatedAt: (payload["updatedAt"] as? String)
                    ?? ISO8601DateFormatter().string(from: Date())
            )
            AmoriSharedStore.savePartnerMood(snapshot)
        } else {
            AmoriSharedStore.savePartnerMood(nil)
        }

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: "PartnerMoodWidget")
        }
        resolve(nil)
    }

    // MARK: - Splitting-countdown Live Activity

    /// Report whether Live Activities are enabled by the user for this app.
    @objc(areLiveActivitiesEnabled:rejecter:)
    func areLiveActivitiesEnabled(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        if #available(iOS 16.1, *) {
            resolve(ActivityAuthorizationInfo().areActivitiesEnabled)
        } else {
            resolve(false)
        }
    }

    /// Start (or restart) the splitting-countdown Live Activity.
    /// payload: { endsAt: epochMs, startedAt?: epochMs, owner: "self"|"partner", partnerName?: string }
    @objc(startSplittingActivity:resolver:rejecter:)
    func startSplittingActivity(
        _ payload: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 16.1, *) else {
            reject("unsupported", "Live Activities require iOS 16.1 or later.", nil)
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            reject("disabled", "Live Activities are disabled for Amori.", nil)
            return
        }
        guard let endsMs = (payload["endsAt"] as? NSNumber)?.doubleValue else {
            reject("bad_args", "startSplittingActivity requires an `endsAt` epoch-ms value.", nil)
            return
        }

        // If one is already running, end it first so we don't stack activities.
        endCurrentActivity(finished: false)

        let endsAt = Date(timeIntervalSince1970: endsMs / 1000)
        let startedAt = (payload["startedAt"] as? NSNumber)
            .map { Date(timeIntervalSince1970: $0.doubleValue / 1000) } ?? Date()
        let owner = (payload["owner"] as? String) ?? "self"
        let partnerName = payload["partnerName"] as? String

        let attributes = SplittingActivityAttributes(partnerName: partnerName)
        let state = SplittingActivityAttributes.ContentState(
            endsAt: endsAt, startedAt: startedAt, owner: owner, finished: false
        )

        do {
            let activity: Activity<SplittingActivityAttributes>
            if #available(iOS 16.2, *) {
                activity = try Activity.request(
                    attributes: attributes,
                    content: ActivityContent(state: state, staleDate: endsAt),
                    pushType: nil
                )
            } else {
                activity = try Activity.request(
                    attributes: attributes,
                    contentState: state,
                    pushType: nil
                )
            }
            currentActivityID = activity.id
            resolve(activity.id)
        } catch {
            reject("start_failed", "Could not start the Live Activity: \(error.localizedDescription)", error)
        }
    }

    /// Update the running activity's countdown target (e.g. after extending space).
    /// payload: { endsAt: epochMs, startedAt?: epochMs, owner?: string, finished?: bool }
    @objc(updateSplittingActivity:resolver:rejecter:)
    func updateSplittingActivity(
        _ payload: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 16.1, *) else {
            resolve(nil); return
        }
        guard let activity = currentSplittingActivity() else {
            resolve(nil); return
        }
        guard let endsMs = (payload["endsAt"] as? NSNumber)?.doubleValue else {
            reject("bad_args", "updateSplittingActivity requires an `endsAt` epoch-ms value.", nil)
            return
        }

        let endsAt = Date(timeIntervalSince1970: endsMs / 1000)
        // Keep the original start time unless a new one is explicitly provided,
        // so the progress ring stays anchored to when the window began.
        let priorState = activity.contentState
        let startedAt = (payload["startedAt"] as? NSNumber)
            .map { Date(timeIntervalSince1970: $0.doubleValue / 1000) }
            ?? priorState.startedAt
        let owner = (payload["owner"] as? String) ?? priorState.owner
        let finished = (payload["finished"] as? NSNumber)?.boolValue ?? false

        let state = SplittingActivityAttributes.ContentState(
            endsAt: endsAt, startedAt: startedAt, owner: owner, finished: finished
        )

        Task {
            if #available(iOS 16.2, *) {
                await activity.update(ActivityContent(state: state, staleDate: endsAt))
            } else {
                await activity.update(using: state)
            }
            resolve(nil)
        }
    }

    /// End the running activity. payload: { finished?: bool }
    @objc(endSplittingActivity:resolver:rejecter:)
    func endSplittingActivity(
        _ payload: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 16.1, *) else {
            resolve(nil); return
        }
        let finished = (payload["finished"] as? NSNumber)?.boolValue ?? true
        endCurrentActivity(finished: finished)
        resolve(nil)
    }

    // MARK: - Helpers

    @available(iOS 16.1, *)
    private func currentSplittingActivity() -> Activity<SplittingActivityAttributes>? {
        if let id = currentActivityID,
           let match = Activity<SplittingActivityAttributes>.activities.first(where: { $0.id == id }) {
            return match
        }
        // Fall back to any running activity (survives an app relaunch).
        return Activity<SplittingActivityAttributes>.activities.first
    }

    private func endCurrentActivity(finished: Bool) {
        guard #available(iOS 16.1, *) else { return }
        for activity in Activity<SplittingActivityAttributes>.activities {
            let prior = activity.contentState
            let endState = SplittingActivityAttributes.ContentState(
                endsAt: prior.endsAt,
                startedAt: prior.startedAt,
                owner: prior.owner,
                finished: finished
            )
            Task {
                if #available(iOS 16.2, *) {
                    await activity.end(
                        ActivityContent(state: endState, staleDate: nil),
                        dismissalPolicy: .immediate
                    )
                } else {
                    await activity.end(using: endState, dismissalPolicy: .immediate)
                }
            }
        }
        currentActivityID = nil
    }
}
