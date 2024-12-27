declare module '@usageStats' {
  export interface UsageStatsModule {
    checkPermission(): Promise<boolean>;
    requestPermission(): Promise<void>;
    getUsageStats(days: number): Promise<AppUsageStats[]>;
  }

  export interface AppUsageStats {
    packageName: string;
    appName: string;
    totalTimeInForeground: number;
    lastTimeUsed: number;
    launchCount: number;
  }

  const UsageStats: UsageStatsModule;
  export default UsageStats;
}
