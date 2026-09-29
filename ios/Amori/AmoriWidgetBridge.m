//
//  AmoriWidgetBridge.m
//  Registers the Swift AmoriWidgetBridge module and its methods with the React
//  Native bridge. Member of the "Amori" app target only.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AmoriWidgetBridge, NSObject)

RCT_EXTERN_METHOD(setPartnerMood:(NSDictionary *)payload
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(areLiveActivitiesEnabled:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startSplittingActivity:(NSDictionary *)payload
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateSplittingActivity:(NSDictionary *)payload
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endSplittingActivity:(NSDictionary *)payload
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
