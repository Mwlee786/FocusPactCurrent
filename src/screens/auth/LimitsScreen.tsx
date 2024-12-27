// src/screens/auth/LimitsScreen.tsx

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, Modal, ScrollView, Alert } from 'react-native';
import { useScreenTime, formatTime } from '../../hooks/useScreenTime';
import type { EnhancedAppUsageStats } from '../../hooks/useUsageStatsAndroid';
import UsageStats from '../../native/UsageStats';
import { LimitType, AppLimit } from '../../native/UsageStats';
import { saveAppLimit, removeAppLimit, getAppLimits, getAppLimit } from '../../services/supabase/appLimits';

type TimeframeKey = 'today' | 'yesterday' | 'week' | 'twoWeeks' | 'threeWeeks' | 'month';

const TimeframeSelector: React.FC<{
  selected: TimeframeKey;
  onSelect: (timeframe: TimeframeKey) => void;
}> = ({ selected, onSelect }) => {
  const timeframes: { key: TimeframeKey; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week', label: '7 Days' },
    { key: 'twoWeeks', label: '14 Days' },
    { key: 'threeWeeks', label: '21 Days' },
    { key: 'month', label: '30 Days' },
  ];

  return (
    <View style={styles.timeframeContainer}>
      <FlatList
        horizontal
        data={timeframes}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.timeframeButton,
              selected === item.key && styles.timeframeButtonSelected,
            ]}
            onPress={() => onSelect(item.key)}
          >
            <Text style={[
              styles.timeframeText,
              selected === item.key && styles.timeframeTextSelected,
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.key}
      />
    </View>
  );
};

const AppUsageCard: React.FC<{
  app: EnhancedAppUsageStats;
  timeframe: TimeframeKey;
  totalTimeInTimeframe: number;
  onPress: () => void;
  limit?: AppLimit;
}> = ({ app, timeframe, totalTimeInTimeframe, onPress, limit }) => {
  const percentage = ((app.timeframes[timeframe] / totalTimeInTimeframe) * 100).toFixed(1);
  
  // Convert today's time from milliseconds to minutes for comparison
  const todayTimeInMinutes = Math.floor(app.todayTime / (1000 * 60));
  
  const isTimeLimitExceeded = limit?.timeLimit?.isEnabled && 
    todayTimeInMinutes >= (limit.timeLimit.value || 0);
  
  const isSessionLimitExceeded = limit?.sessionLimit?.isEnabled && 
    app.todaySessions >= (limit.sessionLimit.value || 0);

  return (
    <TouchableOpacity style={styles.appCard} onPress={onPress}>
      <View style={styles.appCardLeft}>
        {app.iconUri && (
          <Image 
            source={{ uri: `data:image/png;base64,${app.iconUri}` }} 
            style={styles.appIcon} 
          />
        )}
        <View style={styles.appInfoContainer}>
          <Text style={styles.appName}>{app.appName}</Text>
          <View style={styles.usageBar}>
            <View 
              style={[
                styles.usageBarFill, 
                { width: `${Math.min(Number(percentage), 100)}%` },
                (isTimeLimitExceeded || isSessionLimitExceeded) && styles.usageBarExceeded
              ]} 
            />
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.sessionText}>
              Sessions: {app.sessions[timeframe]}
            </Text>
            {limit && (
              <View style={styles.limitsContainer}>
                {limit.timeLimit && (
                  <Text style={[
                    styles.limitText,
                    isTimeLimitExceeded && styles.limitTextExceeded
                  ]}>
                    {limit.timeLimit.value}m/day ({todayTimeInMinutes}m used)
                  </Text>
                )}
                {limit.sessionLimit && (
                  <Text style={[
                    styles.limitText,
                    isSessionLimitExceeded && styles.limitTextExceeded
                  ]}>
                    {limit.sessionLimit.value} sessions/day ({app.todaySessions} used)
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
      
      <View style={styles.appCardRight}>
        <Text style={styles.usageTimeText}>
          {formatTime(app.timeframes[timeframe])}
        </Text>
        <Text style={styles.usagePercentageText}>
          {percentage}%
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const TimePicker: React.FC<{
  onSelect: (hours: number, minutes: number) => void;
  onCancel: () => void;
}> = ({ onSelect, onCancel }) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  const hourOptions = Array.from({ length: 13 }, (_, i) => i); // 0-12 hours
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i); // 0-59 minutes

  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerTitle}>Set Daily Time Limit</Text>
      <View style={styles.pickerRow}>
        <View style={styles.pickerColumn}>
          <Text style={styles.pickerLabel}>Hours</Text>
          <ScrollView style={styles.pickerScrollView}>
            {hourOptions.map((h) => (
              <TouchableOpacity
                key={h}
                style={[styles.pickerItem, hours === h && styles.pickerItemSelected]}
                onPress={() => setHours(h)}
              >
                <Text style={[styles.pickerItemText, hours === h && styles.pickerItemTextSelected]}>
                  {h}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.pickerColumn}>
          <Text style={styles.pickerLabel}>Minutes</Text>
          <ScrollView style={styles.pickerScrollView}>
            {minuteOptions.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.pickerItem, minutes === m && styles.pickerItemSelected]}
                onPress={() => setMinutes(m)}
              >
                <Text style={[styles.pickerItemText, minutes === m && styles.pickerItemTextSelected]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
      <View style={styles.pickerButtons}>
        <TouchableOpacity style={styles.pickerButton} onPress={onCancel}>
          <Text style={styles.pickerButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.pickerButton, styles.pickerButtonPrimary]}
          onPress={() => onSelect(hours, minutes)}
        >
          <Text style={styles.pickerButtonTextPrimary}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const SessionPicker: React.FC<{
  onSelect: (sessions: number) => void;
  onCancel: () => void;
}> = ({ onSelect, onCancel }) => {
  const [sessions, setSessions] = useState(5);
  const sessionOptions = Array.from({ length: 31 }, (_, i) => i); // 0-30 sessions

  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerTitle}>Set Daily Session Limit</Text>
      <View style={styles.pickerColumn}>
        <Text style={styles.pickerLabel}>Number of Sessions</Text>
        <ScrollView style={styles.pickerScrollView}>
          {sessionOptions.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.pickerItem, sessions === s && styles.pickerItemSelected]}
              onPress={() => setSessions(s)}
            >
              <Text style={[styles.pickerItemText, sessions === s && styles.pickerItemTextSelected]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.pickerButtons}>
        <TouchableOpacity style={styles.pickerButton} onPress={onCancel}>
          <Text style={styles.pickerButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.pickerButton, styles.pickerButtonPrimary]}
          onPress={() => onSelect(sessions)}
        >
          <Text style={styles.pickerButtonTextPrimary}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const BlockingScreen: React.FC<{
  appName: string;
  currentUsage: string;
  onClose: () => void;
}> = ({ appName, currentUsage, onClose }) => {
  const quotes = [
    {
      text: "All we have to decide is what to do with the time that is given us.",
      author: "J.R.R. Tolkien"
    },
    {
      text: "Time is what we want most, but what we use worst.",
      author: "William Penn"
    },
    {
      text: "The future depends on what you do today.",
      author: "Mahatma Gandhi"
    }
  ];

  const randomQuote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

  return (
    <View style={styles.blockingContainer}>
      <Text style={styles.blockingAppName}>STAYFREE</Text>
      <Text style={styles.blockingTitle}>{appName}</Text>
      <Text style={styles.blockingSubtitle}>Story is blocked!</Text>
      
      <View style={styles.blockingCard}>
        <Text style={styles.blockingUsage}>Today's usage: {currentUsage}</Text>
        
        <View style={styles.blockingTabs}>
          <TouchableOpacity style={[styles.blockingTab, styles.blockingTabActive]}>
            <Text style={styles.blockingTabText}>QUOTE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.blockingTab}>
            <Text style={styles.blockingTabText}>CHART</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.blockingQuote}>"{randomQuote.text}"</Text>
        <Text style={styles.blockingAuthor}>{randomQuote.author}</Text>
      </View>
      
      <Text style={styles.blockingMessage}>
        This app is blocked via In-App Blocking.
      </Text>
      
      <TouchableOpacity style={styles.blockingButton} onPress={onClose}>
        <Text style={styles.blockingButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

const LimitsScreen: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeKey>('today');
  const { stats, loading, error, checkAndRequestPermission } = useScreenTime(30);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<EnhancedAppUsageStats | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [appLimits, setAppLimits] = useState<Record<string, AppLimit>>({});
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);

  useEffect(() => {
    checkAndRequestPermission();
  }, [checkAndRequestPermission]);

  useEffect(() => {
    const loadAppLimits = async () => {
      try {
        const limits = await getAppLimits();
        const limitsMap: Record<string, AppLimit> = {};
        
        for (const limit of limits) {
          const appLimit: AppLimit = {};
          
          if (limit.time_limit_enabled && limit.time_limit_value !== null) {
            appLimit.timeLimit = {
              value: limit.time_limit_value,
              isEnabled: limit.time_limit_enabled
            };
          }
          
          if (limit.session_limit_enabled && limit.session_limit_value !== null) {
            appLimit.sessionLimit = {
              value: limit.session_limit_value,
              isEnabled: limit.session_limit_enabled
            };
          }
          
          if (appLimit.timeLimit || appLimit.sessionLimit) {
            limitsMap[limit.package_name] = appLimit;
          }
        }
        
        setAppLimits(limitsMap);
      } catch (err) {
        console.error('Error loading app limits from Supabase:', err);
      }
    };

    loadAppLimits();
  }, []);

  const handleTimeframeSelect = useCallback((timeframe: TimeframeKey) => {
    setSelectedTimeframe(timeframe);
  }, []);

  const totalTimeInTimeframe = useMemo(() => 
    stats.reduce((total: number, app: EnhancedAppUsageStats) => 
      total + app.timeframes[selectedTimeframe], 0),
    [stats, selectedTimeframe]
  );

  const handleAppPress = useCallback((app: EnhancedAppUsageStats) => {
    setSelectedApp(app);
    setShowLimitModal(true);
  }, []);

  const handleSetLimit = useCallback(async (limitType: LimitType, value: number) => {
    if (!selectedApp) return;
    
    try {
      setSavingLimit(true);
      setLimitError(null);

      console.log('DEBUG: Setting limit for', selectedApp.packageName, ':', limitType, value);
      
      // Save to native module
      await UsageStats?.setAppLimit(selectedApp.packageName, limitType, value);
      console.log('DEBUG: Successfully set limit in native module');
      
      // Get existing limits from Supabase
      const existingLimit = await getAppLimit(selectedApp.packageName);
      
      // Prepare the update data
      const updateData = {
        package_name: selectedApp.packageName,
        app_name: selectedApp.appName,
        time_limit_value: limitType === 'time' ? value : existingLimit?.time_limit_value ?? null,
        session_limit_value: limitType === 'sessions' ? value : existingLimit?.session_limit_value ?? null,
        time_limit_enabled: limitType === 'time' ? true : existingLimit?.time_limit_enabled ?? false,
        session_limit_enabled: limitType === 'sessions' ? true : existingLimit?.session_limit_enabled ?? false,
        is_public: false
      };
      
      // Save to Supabase
      const savedLimit = await saveAppLimit(
        selectedApp.packageName,
        selectedApp.appName,
        limitType,
        value,
        false // isPublic
      );
      console.log('DEBUG: Successfully saved limit to Supabase:', savedLimit);
      
      if (savedLimit) {
        setAppLimits(prev => {
          const existingLimit = prev[selectedApp.packageName] || {};
          const updatedLimit: AppLimit = { ...existingLimit };
          
          if (limitType === 'time') {
            updatedLimit.timeLimit = {
              value,
              isEnabled: true
            };
          } else {
            updatedLimit.sessionLimit = {
              value,
              isEnabled: true
            };
          }
          
          return {
            ...prev,
            [selectedApp.packageName]: updatedLimit
          };
        });
        
        Alert.alert(
          "Success",
          `${limitType === 'time' ? 'Time' : 'Session'} limit set successfully for ${selectedApp.appName}`,
          [{ text: "OK" }]
        );
      }
    } catch (err) {
      console.error('Error setting app limit:', err);
      setLimitError('Failed to set app limit. Please try again.');
      
      Alert.alert(
        "Error",
        "Failed to set app limit. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSavingLimit(false);
      setShowLimitModal(false);
      setShowTimePicker(false);
      setShowSessionPicker(false);
      setSelectedApp(null);
    }
  }, [selectedApp]);

  const handleRemoveLimit = useCallback(async (app: EnhancedAppUsageStats, limitType: LimitType) => {
    try {
      setSavingLimit(true);
      setLimitError(null);

      console.log('DEBUG: Removing', limitType, 'limit for', app.packageName);
      
      // Get existing limits
      const existingLimit = await getAppLimit(app.packageName);
      if (!existingLimit) return;

      // Prepare update data based on which limit is being removed
      const updateData = {
        package_name: app.packageName,
        app_name: app.appName,
        time_limit_value: limitType === 'time' ? null : existingLimit.time_limit_value,
        session_limit_value: limitType === 'sessions' ? null : existingLimit.session_limit_value,
        time_limit_enabled: limitType === 'time' ? false : existingLimit.time_limit_enabled,
        session_limit_enabled: limitType === 'sessions' ? false : existingLimit.session_limit_enabled,
        is_public: false
      };

      // Remove from native module
      await UsageStats?.removeAppLimit(app.packageName, limitType);
      console.log('DEBUG: Successfully removed', limitType, 'limit from native module');
      
      // Update Supabase
      const saved = await saveAppLimit(
        app.packageName,
        app.appName,
        limitType,
        null,
        false
      );
      console.log('DEBUG: Successfully updated limits in Supabase:', saved);
      
      if (saved) {
        setAppLimits(prev => {
          const currentLimit = prev[app.packageName];
          if (!currentLimit) return prev;

          const updatedLimit = { ...currentLimit };
          if (limitType === 'time') {
            delete updatedLimit.timeLimit;
          } else {
            delete updatedLimit.sessionLimit;
          }

          // If no limits remain, remove the app entry completely
          if (!updatedLimit.timeLimit && !updatedLimit.sessionLimit) {
            const newLimits = { ...prev };
            delete newLimits[app.packageName];
            return newLimits;
          }

          return {
            ...prev,
            [app.packageName]: updatedLimit
          };
        });
        
        Alert.alert(
          "Success",
          `${limitType === 'time' ? 'Time' : 'Session'} limit removed successfully for ${app.appName}`,
          [{ text: "OK" }]
        );
      }
    } catch (err) {
      console.error('Error removing app limit:', err);
      Alert.alert(
        "Error",
        `Failed to remove ${limitType} limit. Please try again.`,
        [{ text: "OK" }]
      );
    } finally {
      setSavingLimit(false);
    }
  }, []);

  const handleTimeLimit = useCallback((hours: number, minutes: number) => {
    const totalMinutes = (hours * 60) + minutes;
    handleSetLimit('time', totalMinutes);
    setShowTimePicker(false);
  }, [handleSetLimit]);

  const handleSessionLimit = useCallback((sessions: number) => {
    handleSetLimit('sessions', sessions);
    setShowSessionPicker(false);
  }, [handleSetLimit]);

  const renderLimitModal = () => (
    <Modal
      visible={showLimitModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowLimitModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Set Limit for {selectedApp?.appName}</Text>
          
          {limitError && (
            <Text style={styles.errorText}>{limitError}</Text>
          )}
          
          <TouchableOpacity 
            style={[styles.limitOption, savingLimit && styles.limitOptionDisabled]}
            disabled={savingLimit}
            onPress={() => {
              setShowLimitModal(false);
              setShowTimePicker(true);
            }}
          >
            <Text style={styles.limitOptionText}>Set Daily Time Limit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.limitOption, savingLimit && styles.limitOptionDisabled]}
            disabled={savingLimit}
            onPress={() => {
              setShowLimitModal(false);
              setShowSessionPicker(true);
            }}
          >
            <Text style={styles.limitOptionText}>Set Daily Session Limit</Text>
          </TouchableOpacity>

          {selectedApp && appLimits[selectedApp.packageName] && (
            <>
              {appLimits[selectedApp.packageName].timeLimit && (
                <TouchableOpacity 
                  style={[styles.limitOption, styles.removeLimitOption, savingLimit && styles.limitOptionDisabled]}
                  disabled={savingLimit}
                  onPress={() => {
                    setShowLimitModal(false);
                    handleRemoveLimit(selectedApp, 'time');
                  }}
                >
                  <Text style={styles.removeLimitText}>Remove Time Limit</Text>
                </TouchableOpacity>
              )}
              
              {appLimits[selectedApp.packageName].sessionLimit && (
                <TouchableOpacity 
                  style={[styles.limitOption, styles.removeLimitOption, savingLimit && styles.limitOptionDisabled]}
                  disabled={savingLimit}
                  onPress={() => {
                    setShowLimitModal(false);
                    handleRemoveLimit(selectedApp, 'sessions');
                  }}
                >
                  <Text style={styles.removeLimitText}>Remove Session Limit</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          
          <TouchableOpacity 
            style={styles.cancelButton}
            disabled={savingLimit}
            onPress={() => setShowLimitModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
        {error.includes('permission') && (
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={checkAndRequestPermission}
          >
            <Text style={styles.permissionButtonText}>
              Grant Permission
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TimeframeSelector
        selected={selectedTimeframe}
        onSelect={handleTimeframeSelect}
      />
      <Text style={styles.totalTime}>
        Total Time: {formatTime(totalTimeInTimeframe)}
      </Text>
      <FlatList
        data={stats
          .filter(app => app.timeframes[selectedTimeframe] > 0) // Only show apps with usage in selected timeframe
          .sort((a, b) => 
            b.timeframes[selectedTimeframe] - a.timeframes[selectedTimeframe]
          )}
        renderItem={({ item }) => (
          <AppUsageCard
            app={item}
            timeframe={selectedTimeframe}
            totalTimeInTimeframe={totalTimeInTimeframe}
            onPress={() => handleAppPress(item)}
            limit={appLimits[item.packageName]}
          />
        )}
        keyExtractor={(item) => item.packageName}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No app usage data available for this time period</Text>
          </View>
        )}
      />
      
      {renderLimitModal()}

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalContainer}>
          <TimePicker
            onSelect={handleTimeLimit}
            onCancel={() => setShowTimePicker(false)}
          />
        </View>
      </Modal>

      {/* Session Picker Modal */}
      <Modal
        visible={showSessionPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSessionPicker(false)}
      >
        <View style={styles.modalContainer}>
          <SessionPicker
            onSelect={handleSessionLimit}
            onCancel={() => setShowSessionPicker(false)}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeframeContainer: {
    marginBottom: 16,
  },
  timeframeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  timeframeButtonSelected: {
    backgroundColor: '#007AFF',
  },
  timeframeText: {
    color: '#333',
  },
  timeframeTextSelected: {
    color: '#fff',
  },
  totalTime: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  appCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appCardLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  appCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  appInfoContainer: {
    flex: 1,
    marginRight: 16,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  usageBar: {
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    marginTop: 4,
    width: '100%',
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  usageBarExceeded: {
    backgroundColor: '#ff3b30',
  },
  usageTimeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  usagePercentageText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sessionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  permissionButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  limitOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cancelButton: {
    marginTop: 20,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  appName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  pickerScrollView: {
    height: 200,
  },
  pickerItem: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  pickerItemSelected: {
    backgroundColor: '#007AFF20',
  },
  pickerItemText: {
    fontSize: 18,
    color: '#333',
  },
  pickerItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  pickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  pickerButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 8,
    borderRadius: 8,
  },
  pickerButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  pickerButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  pickerButtonTextPrimary: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  limitsContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  limitText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  limitTextExceeded: {
    color: '#ff3b30',
    fontWeight: '600',
  },
  blockingContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockingAppName: {
    color: '#8a2be2',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  blockingTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  blockingSubtitle: {
    color: 'white',
    fontSize: 24,
    marginBottom: 32,
  },
  blockingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 32,
  },
  blockingUsage: {
    fontSize: 18,
    marginBottom: 16,
  },
  blockingTabs: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 24,
  },
  blockingTab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  blockingTabActive: {
    backgroundColor: '#8a2be2',
    borderRadius: 8,
  },
  blockingTabText: {
    color: '#666',
    fontWeight: '500',
  },
  blockingTabTextActive: {
    color: 'white',
  },
  blockingQuote: {
    fontSize: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },
  blockingAuthor: {
    color: '#8a2be2',
    textAlign: 'center',
  },
  blockingMessage: {
    color: 'white',
    marginBottom: 24,
  },
  blockingButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  blockingButtonText: {
    color: '#8a2be2',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#ff3b30',
    marginBottom: 16,
    textAlign: 'center',
  },
  limitOptionDisabled: {
    opacity: 0.5,
  },
  limitOptionText: {
    fontSize: 16,
    color: '#007AFF',
  },
  removeLimitOption: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
  },
  removeLimitText: {
    fontSize: 16,
    color: '#ff3b30',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default LimitsScreen;