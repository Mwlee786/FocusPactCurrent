#import "ScreenTime.h"
#import <ManagedSettings/ManagedSettings.h>
#import <FamilyControls/FamilyControls.h>

@implementation ScreenTime {
    MSSelfManagedShieldManager *_shieldManager;
    MSSelfManagedApplicationController *_appController;
    NSMutableDictionary *_appLimits;
}

RCT_EXPORT_MODULE();

- (instancetype)init {
    self = [super init];
    if (self) {
        if (@available(iOS 15.0, *)) {
            _shieldManager = [[MSSelfManagedShieldManager alloc] init];
            _appController = [[MSSelfManagedApplicationController alloc] init];
            _appLimits = [NSMutableDictionary dictionary];
        }
    }
    return self;
}

- (dispatch_queue_t)methodQueue {
    return dispatch_get_main_queue();
}

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

RCT_EXPORT_METHOD(checkPermission:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    if (@available(iOS 15.0, *)) {
        [FamilyControls.shared checkAuthorizationStatus:^(FamilyControlsAuthorizationStatus status, NSError * _Nullable error) {
            if (error) {
                reject(@"permission_error", @"Failed to check permission", error);
                return;
            }
            resolve(@(status == FamilyControlsAuthorizationStatusApproved));
        }];
    } else {
        reject(@"version_error", @"Screen Time API requires iOS 15.0 or later", nil);
    }
}

RCT_EXPORT_METHOD(requestPermission:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    if (@available(iOS 15.0, *)) {
        [FamilyControls.shared requestAuthorizationWithCompletion:^(FamilyControlsAuthorizationStatus status, NSError * _Nullable error) {
            if (error) {
                reject(@"permission_error", @"Failed to request permission", error);
                return;
            }
            resolve(@(status == FamilyControlsAuthorizationStatusApproved));
        }];
    } else {
        reject(@"version_error", @"Screen Time API requires iOS 15.0 or later", nil);
    }
}

RCT_EXPORT_METHOD(getUsageStats:(double)startTime
                  endTime:(double)endTime
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    if (@available(iOS 15.0, *)) {
        [FamilyControls.shared checkAuthorizationStatus:^(FamilyControlsAuthorizationStatus status, NSError * _Nullable error) {
            if (error || status != FamilyControlsAuthorizationStatusApproved) {
                reject(@"permission_error", @"Screen Time access not authorized", error);
                return;
            }
            
            // Get the selection of monitored apps
            [FamilyControls.shared getSelectionWithCompletion:^(FamilyActivitySelection * _Nullable selection, NSError * _Nullable error) {
                if (error) {
                    reject(@"selection_error", @"Failed to get app selection", error);
                    return;
                }
                
                NSMutableArray *stats = [NSMutableArray array];
                for (ApplicationToken *token in selection.applicationTokens) {
                    NSString *bundleId = token.identifier;
                    NSString *appName = [[NSBundle bundleWithIdentifier:bundleId] objectForInfoDictionaryKey:@"CFBundleDisplayName"];
                    if (!appName) appName = bundleId;
                    
                    // Get the shield state for this app
                    MSShieldConfiguration *shield = [self->_shieldManager effectiveShieldConfigurationForToken:token];
                    BOOL isRestricted = (shield != nil);
                    
                    NSDictionary *appStats = @{
                        @"packageName": bundleId,
                        @"appName": appName,
                        @"isRestricted": @(isRestricted),
                        @"todayTime": @0, // We'll implement this with UserDefaults tracking
                        @"yesterdayTime": @0,
                        @"todaySessions": @0,
                        @"yesterdaySessions": @0,
                        @"lastTimeUsed": @([[NSDate date] timeIntervalSince1970] * 1000)
                    };
                    [stats addObject:appStats];
                }
                
                resolve(stats);
            }];
        }];
    } else {
        reject(@"version_error", @"Screen Time API requires iOS 15.0 or later", nil);
    }
}

RCT_EXPORT_METHOD(setAppLimit:(NSString *)packageName
                  limitType:(NSString *)limitType
                  value:(NSInteger)value
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    if (@available(iOS 15.0, *)) {
        ApplicationToken *token = [[ApplicationToken alloc] initWithIdentifier:packageName];
        MSShieldConfiguration *shield = [[MSShieldConfiguration alloc] init];
        
        // Configure the shield
        shield.primaryButtonLabel = @"Close";
        shield.primaryButtonBackgroundColor = [UIColor whiteColor];
        shield.headline = @"Story is blocked!";
        
        NSString *subheadline;
        if ([limitType isEqualToString:@"time"]) {
            subheadline = [NSString stringWithFormat:@"You've reached your %ld minute limit for today.", (long)value];
        } else {
            subheadline = [NSString stringWithFormat:@"You've reached your %ld session limit for today.", (long)value];
        }
        shield.subheadline = subheadline;
        
        // Store the limit
        _appLimits[packageName] = @{
            @"type": limitType,
            @"value": @(value),
            @"isEnabled": @YES
        };
        
        // Apply the shield
        [_shieldManager setShieldConfiguration:shield forToken:token];
        
        resolve(@YES);
    } else {
        reject(@"version_error", @"Screen Time API requires iOS 15.0 or later", nil);
    }
}

RCT_EXPORT_METHOD(getAppLimit:(NSString *)packageName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    if (@available(iOS 15.0, *)) {
        NSDictionary *limit = _appLimits[packageName];
        if (limit) {
            resolve(limit);
        } else {
            resolve([NSNull null]);
        }
    } else {
        reject(@"version_error", @"Screen Time API requires iOS 15.0 or later", nil);
    }
}

RCT_EXPORT_METHOD(removeAppLimit:(NSString *)packageName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    if (@available(iOS 15.0, *)) {
        ApplicationToken *token = [[ApplicationToken alloc] initWithIdentifier:packageName];
        [_shieldManager removeShieldConfigurationForToken:token];
        [_appLimits removeObjectForKey:packageName];
        resolve(@YES);
    } else {
        reject(@"version_error", @"Screen Time API requires iOS 15.0 or later", nil);
    }
}

@end