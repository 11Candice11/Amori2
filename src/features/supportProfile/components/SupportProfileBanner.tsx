/**
 * SupportProfileBanner — a dashboard "complete your How to Know Me" nudge.
 *
 * Shows the owner's Support Profile progress (X of 7 chapters, a progress bar)
 * and opens the handbook on tap. Behaves like a KYC/onboarding banner: it is
 * shown only while the profile is incomplete and hides itself entirely once all
 * seven sections are done. Renders nothing while loading or when there's no
 * data yet, so it never flashes an empty/'0 of 7' state on a slow network.
 */
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import { colors, spacing, typography } from '../../../shared/theme';
import type { MainTabParamList } from '../../../navigation/types';
import { useOwnSupportProfile } from '../hooks/useSupportProfile';
import { calculateCompletion } from '../utils/completion';

export function SupportProfileBanner() {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const { profile } = useOwnSupportProfile();

  const completion = useMemo(
    () => (profile ? calculateCompletion(profile) : null),
    [profile],
  );

  const open = useCallback(() => {
    navigation.navigate('SupportProfile', { screen: 'SupportProfileHome' });
  }, [navigation]);

  // Nothing to show until the profile has loaded.
  if (!completion) return null;

  // Complete → hide the banner entirely.
  if (completion.completedSections >= completion.totalSections) return null;

  const { completedSections, totalSections, percentage } = completion;
  const remaining = totalSections - completedSections;

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Complete How to Know Me. ${completedSections} of ${totalSections} sections done. ${percentage}% complete.`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>GETTING TO KNOW YOU</Text>
        <Text style={styles.pct}>{percentage}%</Text>
      </View>

      <Text style={styles.title}>Finish your “How to Know Me”</Text>
      <Text style={styles.body}>
        {completedSections === 0
          ? `Answer ${totalSections} short sections so your partner knows what helps, what to avoid, and the little things you love.`
          : `${remaining} of ${totalSections} ${remaining === 1 ? 'section' : 'sections'} left. You're almost there.`}
      </Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {completedSections} of {totalSections} chapters written
        </Text>
        <Text style={styles.cta}>Continue →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gold,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.9 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  kicker: { ...typography.label, color: colors.gold },
  pct: { ...typography.bodySemiBold, color: colors.gold, fontSize: 13 },
  title: { ...typography.headlineSm, color: colors.neutral, fontSize: 18 },
  body: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    marginTop: 4,
    marginBottom: spacing.sm,
    lineHeight: 19,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.gold },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  footerText: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 12 },
  cta: { ...typography.bodySemiBold, color: colors.gold, fontSize: 13 },
});
