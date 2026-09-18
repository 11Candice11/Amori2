/**
 * MoodDetailScreen — read-only view of the user's current mood set and their
 * partner's mood. Reached from the Home "Open View" button once a check-in
 * has been logged for the day.
 */
import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography } from '../../../shared/theme';
import type { MoodStackParamList } from '../../../navigation/MoodStackParamList';
import { useDashboard } from '../../home/hooks/useDashboard';
import {
  QUADRANT_DESCRIPTIONS,
  quadrantFromCheckIn,
  type MoodQuadrant,
} from '../types/mood.types';

type Nav = NativeStackNavigationProp<MoodStackParamList, 'MoodDetail'>;

function moodLabel(mood: string, feelings: string | null): string {
  return feelings?.trim() ? feelings : mood;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function MoodDetailScreen() {
  const navigation = useNavigation<Nav>();
  const dashboard = useDashboard();

  // Re-fetch when this view regains focus so a mood logged/changed later in
  // the day is reflected here too.
  const { refresh } = dashboard;
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const goHome = () => navigation.getParent()?.navigate('Home');

  const myQuadrant: MoodQuadrant | null = dashboard.currentMood
    ? quadrantFromCheckIn(dashboard.currentMood.feelings, dashboard.currentMood.mood)
    : null;
  const myDesc = myQuadrant ? QUADRANT_DESCRIPTIONS[myQuadrant] : null;

  const partnerName = dashboard.partnerName || 'Your partner';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={goHome}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          android_ripple={{ color: 'rgba(197,163,101,0.15)', borderless: true }}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.eyebrow}>Emotional Pulse</Text>
      </View>

      {dashboard.loading && !dashboard.currentMood ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Your mood */}
          <Text style={styles.sectionLabel}>YOU</Text>
          {dashboard.currentMood ? (
            <View style={styles.card}>
              <View style={styles.moodPill}>
                <View style={styles.dot} />
                <Text style={styles.moodPillText}>
                  {moodLabel(dashboard.currentMood.mood, dashboard.currentMood.feelings)}
                </Text>
              </View>
              {myDesc ? (
                <>
                  <Text style={styles.quadrantTitle}>{myDesc.title}</Text>
                  <Text style={styles.description}>{myDesc.description}</Text>
                </>
              ) : (
                <Text style={styles.description}>
                  Thank you for checking in today. Your partner can softly tune in.
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.description}>
                You haven't checked in yet today. Head to Check-in to share how you're feeling.
              </Text>
            </View>
          )}

          {/* Partner mood */}
          <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>{partnerName.toUpperCase()}</Text>
          {dashboard.partnerMood ? (
            <View style={styles.card}>
              <View style={styles.moodRow}>
                <View style={styles.moodPill}>
                  <View style={[styles.dot, { backgroundColor: colors.primaryLight }]} />
                  <Text style={styles.moodPillText}>
                    {moodLabel(dashboard.partnerMood.mood, dashboard.partnerMood.feelings)}
                  </Text>
                </View>
                <Text style={styles.timestamp}>{relativeTime(dashboard.partnerMood.createdAt)}</Text>
              </View>
              {(() => {
                const pq = quadrantFromCheckIn(
                  dashboard.partnerMood!.feelings,
                  dashboard.partnerMood!.mood,
                );
                const pd = pq ? QUADRANT_DESCRIPTIONS[pq] : null;
                return pd ? (
                  <>
                    <Text style={styles.quadrantTitle}>{pd.title}</Text>
                    <Text style={styles.description}>{pd.description}</Text>
                  </>
                ) : (
                  <Text style={styles.description}>
                    {partnerName} has shared how they're feeling with you.
                  </Text>
                );
              })()}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.description}>
                {partnerName} hasn't shared a mood yet. When they do, it'll appear here.
              </Text>
            </View>
          )}

          <Pressable
            style={styles.secondaryBtn}
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="Go home"
            android_ripple={{ color: 'rgba(197,163,101,0.12)' }}
          >
            <Text style={styles.secondaryBtnText}>Go Home</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { ...typography.body, color: colors.neutralMuted },
  eyebrow: { ...typography.label, color: colors.gold },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  sectionLabel: { ...typography.label, color: colors.gold, fontSize: 10, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  moodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(197,163,101,0.1)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.25)',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  moodPillText: { ...typography.bodyMedium, color: colors.gold, fontSize: 13 },
  timestamp: { ...typography.bodySm, color: colors.neutralSubtle },
  quadrantTitle: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 15, marginTop: spacing.md },
  description: { ...typography.body, color: colors.neutralMuted, marginTop: spacing.sm, lineHeight: 22 },
  secondaryBtn: {
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  secondaryBtnText: { ...typography.bodySemiBold, color: colors.neutral },
});
