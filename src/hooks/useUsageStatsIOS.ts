import { useState, useEffect, useCallback } from 'react';
import { NativeModules, Alert, Platform } from 'react-native';
import type { UsageStatsReturn, EnhancedAppUsageStats } from './useUsageStatsAndroid';

const { ScreenTime } = NativeModules;

if (Platform.OS === 'ios' && !ScreenTime) {
  console.warn('ScreenTime native module is not available');
}

export const useUsageStats = (days: number = 7): UsageStatsReturn => {
  const [stats, setStats] = useState<EnhancedAppUsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getStatsForTimeRange = useCallback(async (startTime: number, endTime: number): Promise<void> => {
    try {
      const rawStats = await ScreenTime.getUsageStats(startTime, endTime);
      setStats(rawStats);
      setError(null);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage stats');
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
      const hasPermission = await ScreenTime.checkPermission();
      
      if (!hasPermission) {
        return new Promise((resolve) => {
          Alert.alert(
            "Permission Required",
            "This app needs access to Screen Time data to show your app usage statistics.",
            [
              {
                text: "Request Permission",
                onPress: async () => {
                  try {
                    const granted = await ScreenTime.requestPermission();
                    if (granted) {
                      refresh();
                    }
                    resolve(granted);
                  } catch (error) {
                    console.error('Error requesting permission:', error);
                    resolve(false);
                  }
                }
              },
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => resolve(false)
              }
            ]
          );
        });
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
