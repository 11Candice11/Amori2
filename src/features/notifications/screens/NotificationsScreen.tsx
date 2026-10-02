/**
 * NotificationsScreen — a chronological list of every notification for the
 * signed-in user (hugs, reminders, partner-link requests, emergency alerts,
 * partner activity, and so on).
 *
 * Reached from the header bell. Newest notifications appear first, grouped into
 * gentle time buckets. Tapping a notification marks it read; a "Mark all read"
 * action clears the badge in one tap. The list is backed by the shared
 * notificationStore, so the header badge stays in step with what's on screen.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography } from '../../../shared/theme';
import type { MainTabParamList } from '../../../navigation/types';
import { AppHeader } from '../../../shared/components/header';
import {
  notificationStore,
  useNotificationList,
} from '../../../shared/state/notificationStore';
import type { NotificationResponse } from '../../../services/api/types';
import { NotificationTypeIcon } from '../components/NotificationTypeIcon';
import { formatRelativeDate } from '../../../utils/dateUtils';

type Bucket = 'Today' | 'Yesterday' | 'Earlier';

function bucketOf(iso: string): Bucket {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const t = d.getTime();
  if (t >= startOfToday) return 'Today';
  if (t >= startOfYesterday) return 'Yesterday';
  return 'Earlier';
}

const BUCKET_ORDER: Bucket[] = ['Today', 'Yesterday', 'Earlier'];

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainTabParamList>>();
  const { notifications, loading } = useNotificationList();
  const [refreshing, setRefreshing] = useState(false);

  const hasUnread = notifications.some((n) => !n.isRead);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await notificationStore.refresh();
    setRefreshing(false);
  }, []);

  const onPressItem = useCallback(
    (item: NotificationResponse) => {
      if (!item.isRead) {
        void notificationStore.markRead(item.id);
      }

      const type = item.notificationType ?? '';
      const ref = item.referenceId ?? '';

      // Hug notification → open the sent hug confirmation screen.
      if (type === 'Hug' && ref) {
        navigation.navigate('Hugs', {
          screen: 'HugSent',
          params: { hugId: ref, deliveryMs: 0 },
        } as never);
        return;
      }

      // Incident / care-ticket → open the detail screen on the Desk tab.
      if (type === 'Incident' && ref) {
        navigation.navigate('Desk', {
          screen: 'IncidentDetail',
          params: { incidentId: ref },
        } as never);
        return;
      }

      // A link-request notification → take the user to the Link Partner screen
      // so they can accept or decline. The `openLink` nonce tells ProfileScreen
      // to open the modal.
      if (type === 'PartnerLinkRequest') {
        navigation.navigate('Profile', { openLink: Date.now() });
        return;
      }

      // Gift received → open the Hearth Vault where the gift now lives.
      if (type === 'Gift') {
        navigation.navigate('Vault' as never);
        return;
      }

      // Let's Chat message → open the received conversation.
      if (type === 'LetsChat' && ref) {
        navigation.navigate('Chat', {
          screen: 'ChatReceived',
          params: { conversationId: ref },
        } as never);
        return;
      }

      // Vision Board item (partner shared or completed) → open the item detail.
      if (type === 'VisionBoardItem' && ref) {
        navigation.navigate('Together', {
          screen: 'VisionBoardItemDetail',
          params: { itemId: ref },
        } as never);
        return;
      }

      // Calendar event (new event from partner, or reminder) → open the day view.
      // referenceId may be an event id; if it looks like a date use it directly,
      // otherwise open the Calendar so the user can find the event.
      if (type === 'CalendarEvent') {
        const isDateString = /^\d{4}-\d{2}-\d{2}$/.test(ref);
        if (isDateString) {
          navigation.navigate('Together', {
            screen: 'CalendarDay',
            params: { date: ref },
          } as never);
        } else {
          navigation.navigate('Together', {
            screen: 'Calendar',
          } as never);
        }
        return;
      }
    },
    [navigation],
  );

  const onMarkAllRead = useCallback(() => {
    void notificationStore.markAllRead();
  }, []);

  // Group in place — the list is already newest-first from the store.
  const grouped: Record<Bucket, NotificationResponse[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };
  for (const n of notifications) {
    grouped[bucketOf(n.createdAt)].push(n);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <AppHeader
        title="Notifications"
        onBack={() => navigation.goBack()}
        showNotificationBell={false}
        right={
          hasUnread ? (
            <Pressable
              onPress={onMarkAllRead}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications read"
              android_ripple={{ color: colors.goldTint15, borderless: true }}
            >
              <Text style={styles.markAll}>Mark all read</Text>
            </Pressable>
          ) : undefined
        }
      />

      {loading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>You're all caught up</Text>
          <Text style={styles.emptyBody}>
            Hugs, reminders and updates from your partner will gather here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
            />
          }
        >
          {BUCKET_ORDER.map((bucket) => {
            const rows = grouped[bucket];
            if (rows.length === 0) return null;
            return (
              <View key={bucket} style={styles.section}>
                <Text style={styles.sectionLabel}>{bucket}</Text>
                {rows.map((item) => (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.row,
                      !item.isRead && styles.rowUnread,
                      pressed && styles.rowPressed,
                    ]}
                    onPress={() => onPressItem(item)}
                    android_ripple={{ color: colors.goldTint12 }}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title}${item.isRead ? '' : ', unread'}`}
                  >
                    <View style={styles.iconWrap}>
                      <NotificationTypeIcon type={item.notificationType} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.body ? (
                        <Text style={styles.rowBody} numberOfLines={2}>
                          {item.body}
                        </Text>
                      ) : null}
                      <Text style={styles.rowTime}>{formatRelativeDate(item.createdAt)}</Text>
                    </View>
                    {!item.isRead ? <View style={styles.unreadDot} /> : null}
                  </Pressable>
                ))}
              </View>
            );
          })}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.headlineSm, color: colors.neutral, textAlign: 'center' },
  emptyBody: { ...typography.body, color: colors.neutralMuted, textAlign: 'center', lineHeight: 22 },

  markAll: { ...typography.bodySm, color: colors.gold, fontSize: 13 },

  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  section: { marginBottom: spacing.md },
  sectionLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowUnread: {
    borderColor: colors.goldTint35,
  },
  rowPressed: { opacity: 0.75 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldTint08,
    borderWidth: 1,
    borderColor: colors.goldTint25,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 15 },
  rowBody: { ...typography.body, color: colors.neutralMuted, fontSize: 13, lineHeight: 19 },
  rowTime: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11, marginTop: 2 },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.emergency,
    flexShrink: 0,
  },
});
