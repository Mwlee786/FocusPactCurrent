import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Linking, AppState, Platform } from 'react-native';
import UsageStats from '../native/UsageStats';

// Base interface matching exactly what comes from native module
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

// Enhanced interface with calculated fields
export interface EnhancedAppUsageStats extends RawAppUsageStats {
  formattedTime: string;
  sessions: {
    today: number;
    yesterday: number;
    week: number;
    twoWeeks: number;
    threeWeeks: number;
    month: number;
  };
  timeframes: {
    today: number;
    yesterday: number;
    week: number;
    twoWeeks: number;
    threeWeeks: number;
    month: number;
  };
}

export interface UsageStatsReturn {
  stats: EnhancedAppUsageStats[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  checkAndRequestPermission: () => Promise<boolean>;
  getStatsForTimeRange: (startTime: number, endTime: number) => Promise<void>;
}

export const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
};

export const useUsageStats = (days: number = 7): UsageStatsReturn => {
  const [stats, setStats] = useState<EnhancedAppUsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getStatsForTimeRange = useCallback(async (startTime: number, endTime: number): Promise<void> => {
    try {
      if (!UsageStats && Platform.OS === 'android') {
        console.error('UsageStats module is not available');
        setError('Usage stats feature is not available on this device');
        setStats([]);
        setLoading(false);
        return;
      }

      const hasPermission = await UsageStats?.checkPermission();
      if (!hasPermission) {
        setError('Usage data access permission is required');
        setStats([]);
        return;
      }

      setLoading(true);
      console.log('DEBUG: Fetching stats from', new Date(startTime), 'to', new Date(endTime));

      // Calculate days between start and end time
      const daysDiff = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
      console.log('DEBUG: Fetching stats for', daysDiff, 'days');
      
      try {
        const rawStats = await UsageStats?.getUsageStats(startTime, endTime, daysDiff);
        console.log('DEBUG: Received', rawStats?.length ?? 0, 'apps from native module');
        
        if (!rawStats || rawStats.length === 0) {
          console.log('DEBUG: No stats received from native module');
          setError('No usage data available');
          setStats([]);
          return;
        }
        
        const enhancedStats: EnhancedAppUsageStats[] = rawStats.map(stat => {
          // Calculate time periods based on the raw data
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          const isToday = (timestamp: number) => {
            const date = new Date(timestamp);
            return date.getDate() === today.getDate() &&
                   date.getMonth() === today.getMonth() &&
                   date.getFullYear() === today.getFullYear();
          };
          
          const isYesterday = (timestamp: number) => {
            const date = new Date(timestamp);
            return date.getDate() === yesterday.getDate() &&
                   date.getMonth() === yesterday.getMonth() &&
                   date.getFullYear() === yesterday.getFullYear();
          };
          
          const isWithinDays = (timestamp: number, days: number) => {
            const date = new Date(timestamp);
            const daysAgo = new Date(today);
            daysAgo.setDate(daysAgo.getDate() - days);
            return date >= daysAgo;
          };

          return {
            ...stat,
            formattedTime: formatTime(stat.todayTime),
            sessions: {
              today: stat.todaySessions,
              yesterday: stat.yesterdaySessions,
              week: isWithinDays(stat.lastTimeUsed, 7) ? stat.todaySessions + stat.yesterdaySessions : 0,
              twoWeeks: isWithinDays(stat.lastTimeUsed, 14) ? stat.todaySessions + stat.yesterdaySessions : 0,
              threeWeeks: isWithinDays(stat.lastTimeUsed, 21) ? stat.todaySessions + stat.yesterdaySessions : 0,
              month: isWithinDays(stat.lastTimeUsed, 30) ? stat.todaySessions + stat.yesterdaySessions : 0,
            },
            timeframes: {
              today: isToday(stat.lastTimeUsed) ? stat.todayTime : 0,
              yesterday: isYesterday(stat.lastTimeUsed) ? stat.yesterdayTime : 0,
              week: isWithinDays(stat.lastTimeUsed, 7) ? stat.todayTime + stat.yesterdayTime : 0,
              twoWeeks: isWithinDays(stat.lastTimeUsed, 14) ? stat.todayTime + stat.yesterdayTime : 0,
              threeWeeks: isWithinDays(stat.lastTimeUsed, 21) ? stat.todayTime + stat.yesterdayTime : 0,
              month: isWithinDays(stat.lastTimeUsed, 30) ? stat.todayTime + stat.yesterdayTime : 0,
            }
          };
        });

        setStats(enhancedStats);
        setError(null);
      } catch (err) {
        console.error('ERROR in getStatsForTimeRange:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch usage stats');
        setStats([]);
      }
    } catch (err) {
      console.error('ERROR in getStatsForTimeRange:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage stats');
      setStats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    const now = Date.now();
    const startTime = now - (days * 24 * 60 * 60 * 1000);
    await getStatsForTimeRange(startTime, now);
  }, [days, getStatsForTimeRange]);

  const checkAndRequestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (!UsageStats) {
        throw new Error('UsageStats module is not available');
      }

      const hasPermission = await UsageStats.checkPermission();
      
      if (!hasPermission) {
        Alert.alert(
          "Permission Required",
          "This app needs access to usage data to show your app usage statistics.",
          [
            {
              text: "Open Settings",
              onPress: async () => {
                try {
                  await Linking.sendIntent('android.settings.USAGE_ACCESS_SETTINGS');
                  const checkOnFocus = () => {
                    refresh();
                  };
                  const subscription = AppState.addEventListener('change', (nextAppState) => {
                    if (nextAppState === 'active') {
                      checkOnFocus();
                    }
                  });
                  return () => {
                    subscription.remove();
                  };
                } catch (error) {
                  console.error('Error opening settings:', error);
                  Linking.openSettings();
                }
              }
            },
            {
              text: "Cancel",
              style: "cancel"
            }
          ]
        );
      }
      return hasPermission;
    } catch (err) {
      console.error("Error checking permissions:", err);
      return false;
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    stats,
    loading,
    error,
    refresh,
    checkAndRequestPermission,
    getStatsForTimeRange
  };
};
