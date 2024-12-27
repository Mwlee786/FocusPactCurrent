import { Platform } from 'react-native';
import { useUsageStats as useAndroidStats, formatTime, type EnhancedAppUsageStats } from './useUsageStatsAndroid';
import { useUsageStats as useIOSStats } from './useUsageStatsIOS';

export { formatTime, type EnhancedAppUsageStats };

export interface UsageStatsReturn {
  stats: EnhancedAppUsageStats[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  checkAndRequestPermission: () => Promise<boolean>;
  getStatsForTimeRange: (startTime: number, endTime: number) => Promise<void>;
}

const getTimeRangeForPeriod = (period: string): { startTime: number; endTime: number } => {
  const now = new Date();
  let endTime = now.getTime();
  let startTime: number;

  switch (period) {
    case 'today':
      // Start of today
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      break;
    case 'yesterday':
      // Start of yesterday
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
      endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      break;
    case 'week':
      // 7 days ago
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime();
      break;
    case 'twoWeeks':
      // 14 days ago
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14).getTime();
      break;
    case 'threeWeeks':
      // 21 days ago
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 21).getTime();
      break;
    case 'month':
      // 30 days ago
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).getTime();
      break;
    default:
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }

  return { startTime, endTime };
};

export const useScreenTime = (days: number = 7): UsageStatsReturn => {
  const androidStats = useAndroidStats(days);
  const iosStats = useIOSStats(days);

  const platformStats = Platform.select({
    ios: iosStats,
    android: androidStats,
    default: androidStats,
  });

  return {
    ...platformStats,
    getStatsForTimeRange: async (startTime: number, endTime: number) => {
      return platformStats.getStatsForTimeRange(startTime, endTime);
    }
  };
};
