package com.main.focuspact

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.os.Process
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream
import java.util.*

class UsageStatsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val appLimits = mutableMapOf<String, AppLimit>()

    data class AppLimit(
        val type: String,
        val value: Int,
        val isEnabled: Boolean = true
    )

    override fun getName(): String = "UsageStats"

    @ReactMethod
    fun setAppLimit(packageName: String, limitType: String, value: Int, promise: Promise) {
        try {
            println("DEBUG: Setting app limit for $packageName: $limitType = $value")
            appLimits[packageName] = AppLimit(limitType, value)
            promise.resolve(true)
        } catch (e: Exception) {
            println("ERROR: Failed to set app limit: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getAppLimit(packageName: String, promise: Promise) {
        try {
            println("DEBUG: Getting app limit for $packageName")
            val limit = appLimits[packageName]
            if (limit != null) {
                val result = Arguments.createMap().apply {
                    putString("type", limit.type)
                    putInt("value", limit.value)
                    putBoolean("isEnabled", limit.isEnabled)
                }
                promise.resolve(result)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            println("ERROR: Failed to get app limit: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun removeAppLimit(packageName: String, promise: Promise) {
        try {
            println("DEBUG: Removing app limit for $packageName")
            appLimits.remove(packageName)
            promise.resolve(true)
        } catch (e: Exception) {
            println("ERROR: Failed to remove app limit: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun checkPermission(promise: Promise) {
        try {
            val appOps = reactApplicationContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                reactApplicationContext.packageName
            )
            promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        // Since we can't directly request this permission, we'll resolve immediately
        promise.resolve(null)
    }

    @ReactMethod
    fun getUsageStats(startTime: Double, endTime: Double, days: Double, promise: Promise) {
        try {
            val usageStatsManager = reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val events = usageStatsManager.queryEvents(startTime.toLong(), endTime.toLong())
            val appUsageMap = mutableMapOf<String, AppUsageData>()
            
            // Get timezone offset and calendar
            val calendar = Calendar.getInstance()
            val todayStart = calendar.apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }.timeInMillis
            
            val yesterdayStart = todayStart - (24 * 60 * 60 * 1000)
            
            // Track active sessions to prevent duplicate counting
            val activeSessions = mutableSetOf<String>()
            var eventCount = 0
            
            while (events.hasNextEvent()) {
                val event = UsageEvents.Event()
                events.getNextEvent(event)
                eventCount++
                
                val packageName = event.packageName
                val timestamp = event.timeStamp
                
                val usageData = appUsageMap.getOrPut(packageName) {
                    AppUsageData(packageName)
                }
                
                when (event.eventType) {
                    UsageEvents.Event.MOVE_TO_FOREGROUND -> {
                        if (!activeSessions.contains(packageName)) {
                            if (timestamp >= todayStart) {
                                usageData.todaySessions++
                            } else if (timestamp >= yesterdayStart) {
                                usageData.yesterdaySessions++
                            }
                            activeSessions.add(packageName)
                        }
                        usageData.lastForegroundTime = timestamp
                    }
                    UsageEvents.Event.MOVE_TO_BACKGROUND -> {
                        if (usageData.lastForegroundTime > 0) {
                            val duration = timestamp - usageData.lastForegroundTime
                            if (duration > 0) {
                                if (timestamp >= todayStart) {
                                    usageData.todayTime += duration
                                } else if (timestamp >= yesterdayStart) {
                                    usageData.yesterdayTime += duration
                                }
                            }
                            usageData.lastForegroundTime = 0
                            activeSessions.remove(packageName)
                        }
                    }
                }
                
                usageData.lastTimeUsed = maxOf(usageData.lastTimeUsed, timestamp)
            }
            
            val resultArray = Arguments.createArray()
            val packageManager = reactApplicationContext.packageManager
            
            appUsageMap.values
                .filter { it.todayTime > 0 || it.yesterdayTime > 0 }
                .forEach { appData ->
                    val appMap = Arguments.createMap().apply {
                        putString("packageName", appData.packageName)
                        putString("appName", getAppName(appData.packageName, packageManager))
                        putDouble("todayTime", appData.todayTime.toDouble())
                        putDouble("yesterdayTime", appData.yesterdayTime.toDouble())
                        putInt("todaySessions", appData.todaySessions)
                        putInt("yesterdaySessions", appData.yesterdaySessions)
                        putDouble("lastTimeUsed", appData.lastTimeUsed.toDouble())
                        
                        // Add isRestricted based on app limits
                        val limit = appLimits[appData.packageName]
                        val isRestricted = if (limit != null) {
                            when (limit.type) {
                                "time" -> appData.todayTime >= (limit.value * 60 * 1000)
                                "sessions" -> appData.todaySessions >= limit.value
                                else -> false
                            }
                        } else {
                            false
                        }
                        putBoolean("isRestricted", isRestricted)
                    }
                    resultArray.pushMap(appMap)
                }
            
            promise.resolve(resultArray)
        } catch (e: Exception) {
            println("ERROR in getUsageStats: ${e.message}")
            e.printStackTrace()
            promise.reject("ERROR", e.message)
        }
    }
    
    private fun getAppName(packageName: String, packageManager: PackageManager): String {
        return try {
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            packageName
        }
    }
    
    private data class AppUsageData(
        val packageName: String,
        var lastTimeUsed: Long = 0,
        var lastForegroundTime: Long = 0,
        var todayTime: Long = 0,
        var yesterdayTime: Long = 0,
        var todaySessions: Int = 0,
        var yesterdaySessions: Int = 0
    )
}