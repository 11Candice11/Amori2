/**
 * localReminderService — schedule and manage local daily check-in reminders.
 *
 * Uses expo-notifications to schedule local notifications that fire at a
 * specific time each day. These are purely local — they don't involve the
 * backend, unlike push notifications from partner actions.
 *
 * The reminder time is stored in 24-hour format "HH:MM" (e.g., "09:00").
 */
import { Platform } from 'react-native';

/** Unique identifier for the daily check-in reminder. */
const CHECKIN_REMINDER_ID = 'daily-checkin-reminder';

/** Lazily load expo-notifications; returns null if not linked/available. */
function loadNotifications(): typeof import('expo-notifications') | null {
  try {
    // Check if expo-modules-core is available (native modules are linked).
    require('expo-modules-core');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return null;
  }
}

/**
 * Parse a time string in "HH:MM" format and return the hour and minute.
 * Returns null if the format is invalid.
 */
function parseTime(timeStr: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Schedule a daily check-in reminder at the specified time.
 * Cancels any existing reminder first.
 *
 * @param timeStr - Time in 24-hour format "HH:MM" (e.g., "09:00", "21:30")
 * @returns Promise that resolves when scheduling is complete, or rejects on error
 */
export async function scheduleDailyCheckInReminder(timeStr: string): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications) {
    console.warn('[localReminderService] expo-notifications not available');
    return;
  }

  const time = parseTime(timeStr);
  if (!time) {
    console.warn(`[localReminderService] Invalid time format: ${timeStr}`);
    return;
  }

  // Cancel any existing reminder before scheduling a new one.
  await cancelDailyCheckInReminder();

  try {
    // Request notification permissions if not already granted.
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[localReminderService] Notification permissions not granted');
      return;
    }

    // On Android, ensure the notification channel exists.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D4AF6A', // colors.gold - richer gold tone
      });
    }

    // Schedule the notification to repeat daily at the specified time.
    await Notifications.scheduleNotificationAsync({
      identifier: CHECKIN_REMINDER_ID,
      content: {
        title: 'Time for your check-in ✨',
        body: "Take a moment to reflect on how you're feeling today.",
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        ...(Platform.OS === 'android' && { channelId: 'reminders' }),
        data: {
          type: 'CheckInReminder',
        },
      },
      trigger: {
        hour: time.hour,
        minute: time.minute,
        repeats: true,
      },
    });

    console.log(`[localReminderService] Scheduled daily reminder at ${timeStr}`);
  } catch (error) {
    console.error('[localReminderService] Failed to schedule reminder:', error);
    throw error;
  }
}

/**
 * Cancel the daily check-in reminder if it exists.
 * Safe to call even if no reminder is scheduled.
 */
export async function cancelDailyCheckInReminder(): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(CHECKIN_REMINDER_ID);
    console.log('[localReminderService] Cancelled daily check-in reminder');
  } catch (error) {
    // Ignore errors — the identifier might not exist, which is fine.
    console.log('[localReminderService] No reminder to cancel or error cancelling:', error);
  }
}

/**
 * Check if a daily check-in reminder is currently scheduled.
 * Returns true if scheduled, false otherwise.
 */
export async function isCheckInReminderScheduled(): Promise<boolean> {
  const Notifications = loadNotifications();
  if (!Notifications) {
    return false;
  }

  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    return scheduledNotifications.some(
      (notification) => notification.identifier === CHECKIN_REMINDER_ID,
    );
  } catch {
    return false;
  }
}

/**
 * Reschedule the daily check-in reminder if the time has changed.
 * This is a convenience wrapper around scheduleDailyCheckInReminder.
 */
export async function updateCheckInReminderTime(newTimeStr: string): Promise<void> {
  return scheduleDailyCheckInReminder(newTimeStr);
}
