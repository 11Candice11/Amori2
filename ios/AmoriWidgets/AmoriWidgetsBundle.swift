//
//  AmoriWidgetsBundle.swift
//  Entry point for the AmoriWidgets extension. Registers the home-screen
//  Partner Mood widget and the splitting-countdown Live Activity.
//
//  Member of the "AmoriWidgets" extension target only.
//

import WidgetKit
import SwiftUI

@main
struct AmoriWidgetsBundle: WidgetBundle {
    var body: some Widget {
        PartnerMoodWidget()
        if #available(iOS 16.1, *) {
            SplittingLiveActivity()
        }
    }
}
