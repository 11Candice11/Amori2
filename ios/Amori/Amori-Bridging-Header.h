//
//  Use this file to import your target's public headers that you would like to expose to Swift.
//

// Expose the React Native bridge module macros/protocols to Swift so the
// @objc(AmoriWidgetBridge) native module and its RCTPromise* block types
// resolve when compiled.
#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>
