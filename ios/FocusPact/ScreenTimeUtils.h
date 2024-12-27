#import <Foundation/Foundation.h>
#import <DeviceActivity/DeviceActivity.h>

@interface ScreenTimeUtils : NSObject

+ (NSString *)cacheKeyForDate:(NSDate *)date;
+ (NSData *)cachedDataForKey:(NSString *)key;
+ (void)cacheData:(NSData *)data forKey:(NSString *)key;
+ (NSDictionary *)transformDeviceActivityEvent:(DeviceActivityEvent *)event
                                   forBundleId:(NSString *)bundleId
                                    startOfDay:(NSDate *)startOfDay;
+ (UIImage *)getAppIcon:(NSString *)bundleId;
+ (NSString *)base64EncodedIconForBundleId:(NSString *)bundleId;

@end
