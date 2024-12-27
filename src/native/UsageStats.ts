import { NativeModules, Platform } from 'react-native';

const { UsageStats, ScreenTime } = NativeModules;

export type LimitType = 'time' | 'sessions';

export interface RawAppUsageStats {
  packageName: string;
  appName: string;
  todayTime: number;
  yesterdayTime: number;
  todaySessions: number;
  yesterdaySessions: number;
  lastTimeUsed: number;
  iconUri?: string;
  isRestricted: boolean;
}

export interface AppLimit {
  timeLimit?: {
    value: number;
    isEnabled: boolean;
  };
  sessionLimit?: {
    value: number;
    isEnabled: boolean;
  };
}

export interface UsageStatsInterface {
  getUsageStats(startTime: number, endTime: number, days: number): Promise<RawAppUsageStats[]>;
  checkPermission(): Promise<boolean>;
  setAppLimit(packageName: string, limitType: LimitType, value: number): Promise<void>;
  removeAppLimit(packageName: string, limitType: LimitType): Promise<void>;
}

// Use the appropriate native module based on platform
const NativeModule = Platform.select({
  ios: ScreenTime,
  android: UsageStats,
}) as UsageStatsInterface | null;

if (!NativeModule) {
  console.warn('Native usage stats module is not available');
}

export default NativeModule; 