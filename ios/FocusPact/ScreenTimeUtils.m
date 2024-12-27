#import "ScreenTimeUtils.h"

@implementation ScreenTimeUtils

static NSString *const kCachePrefix = @"com.focuspact.screentime.cache.";
static const NSTimeInterval kCacheExpiration = 60 * 5; // 5 minutes

+ (NSString *)cacheKeyForDate:(NSDate *)date {
    NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
    formatter.dateFormat = @"yyyy-MM-dd";
    return [NSString stringWithFormat:@"%@%@", kCachePrefix, [formatter stringFromDate:date]];
}

+ (NSData *)cachedDataForKey:(NSString *)key {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSDictionary *cachedData = [defaults objectForKey:key];
    
    if (!cachedData) return nil;
    
    NSDate *timestamp = cachedData[@"timestamp"];
    if ([[NSDate date] timeIntervalSinceDate:timestamp] > kCacheExpiration) {
        [defaults removeObjectForKey:key];
        return nil;
    }
    
    return cachedData[@"data"];
}

+ (void)cacheData:(NSData *)data forKey:(NSString *)key {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    [defaults setObject:@{
        @"data": data,
        @"timestamp": [NSDate date]
    } forKey:key];
}

+ (NSDictionary *)transformDeviceActivityEvent:(DeviceActivityEvent *)event
                                   forBundleId:(NSString *)bundleId
                                    startOfDay:(NSDate *)startOfDay {
    NSTimeInterval duration = [event.endDate timeIntervalSinceDate:event.startDate];
    BOOL isToday = [[[NSCalendar currentCalendar] startOfDayForDate:event.startDate] isEqual:startOfDay];
    
    return @{
        @"duration": @(duration * 1000), // Convert to milliseconds
        @"isToday": @(isToday),
        @"timestamp": @([event.endDate timeIntervalSince1970] * 1000)
    };
}

+ (UIImage *)getAppIcon:(NSString *)bundleId {
    return [UIImage _applicationIconImageForBundleIdentifier:bundleId format:0 scale:[UIScreen mainScreen].scale];
}

+ (NSString *)base64EncodedIconForBundleId:(NSString *)bundleId {
    UIImage *icon = [self getAppIcon:bundleId];
    if (!icon) return nil;
    
    NSData *iconData = UIImagePNGRepresentation(icon);
    if (!iconData) return nil;
    
    return [NSString stringWithFormat:@"data:image/png;base64,%@",
            [iconData base64EncodedStringWithOptions:0]];
}

@end
