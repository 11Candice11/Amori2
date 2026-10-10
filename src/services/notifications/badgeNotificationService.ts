/**
 * Badge Notification Service
 *
 * Handles sending notifications when users earn badges.
 * Integrates with the push notification system to alert users
 * of new achievements and prompt them to view the badge.
 */
import * as Notifications from 'expo-notifications';
import { getBadgeById } from '../../constants/badges';

export type BadgeNotificationCallback = (badgeId: string) => void;

export const badgeNotificationService = {
  /**
   * Check if notifications are enabled (guards all notification operations).
   */
  isAvailable(): boolean {
    try {
      require('expo-modules-core');
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Send a local notification when a badge is earned.
   * Shows the badge name and prompts user to view achievement.
   */
  async notifyBadgeEarned(badgeId: string): Promise<void> {
    if (!badgeNotificationService.isAvailable()) return;

    try {
      const badge = getBadgeById(badgeId);
      if (!badge) return;

      // Send local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Badge Earned!',
          body: `You've unlocked: ${badge.name}`,
          subtitle: badge.description,
          data: {
            type: 'BadgeEarned',
            badgeId: badge.id,
            pointsReward: badge.pointsReward,
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: {
          seconds: 1, // Show immediately
        },
      });
    } catch (err) {
      console.warn('Failed to send badge notification:', err);
    }
  },

  /**
   * Send a notification for level up with associated badge (if any).
   */
  async notifyLevelUp(newLevel: number, badgeId?: string | null): Promise<void> {
    if (!badgeNotificationService.isAvailable()) return;

    try {
      const badge = badgeId ? getBadgeById(badgeId) : null;

      const title = badge ? '🎉 Level Up + Badge!' : '🎉 Level Up!';
      const body = badge
        ? `You've reached Level ${newLevel} and earned: ${badge.name}`
        : `You've reached Level ${newLevel}!`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'LevelUp',
            newLevel,
            badgeId: badgeId || undefined,
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 200, 100, 200],
        },
        trigger: {
          seconds: 1,
        },
      });
    } catch (err) {
      console.warn('Failed to send level up notification:', err);
    }
  },

  /**
   * Register handlers for badge-related notifications.
   * Called from the app's notification setup routine.
   */
  registerHandlers(callbacks?: {
    onBadgeEarned?: BadgeNotificationCallback;
    onLevelUp?: (level: number) => void;
  }): () => void {
    if (!badgeNotificationService.isAvailable()) return () => {};

    const foregroundSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { type, badgeId, newLevel } = response.notification.request.content.data;

        if (type === 'BadgeEarned' && badgeId && callbacks?.onBadgeEarned) {
          callbacks.onBadgeEarned(badgeId as string);
        } else if (type === 'LevelUp' && newLevel && callbacks?.onLevelUp) {
          callbacks.onLevelUp(newLevel as number);
        }
      }
    );

    return () => {
      foregroundSubscription.remove();
    };
  },

  /**
   * Format a badge notification message for sharing/logging.
   */
  formatBadgeMessage(badgeId: string): string {
    const badge = getBadgeById(badgeId);
    if (!badge) return `Unknown badge: ${badgeId}`;

    return `🏆 ${badge.name}: ${badge.description}`;
  },
};
