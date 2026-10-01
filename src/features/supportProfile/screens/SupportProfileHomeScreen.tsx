/**
 * SupportProfileHomeScreen — the owner's "How to Know Me" handbook.
 *
 * Shows overall completion and the seven sections; each opens its own editor.
 * A link opens the read-only partner view. No section is required; private
 * fields still count toward completion.
 */
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import type { SupportProfileStackParamList } from '../../../navigation/SupportProfileStackParamList';
import type { MainTabParamList } from '../../../navigation/types';
import { SECTIONS } from '../constants';
import { useOwnSupportProfile } from '../hooks/useSupportProfile';
import { calculateCompletion } from '../utils/completion';
import type { SectionKey, SupportProfile } from '../types/supportProfile.types';

type Nav = NativeStackNavigationProp<SupportProfileStackParamList, 'SupportProfileHome'>;

/** Count populated fields in a section for the "N answers" hint. */
function sectionSummary(profile: SupportProfile | null, key: SectionKey): { filled: number; shared: boolean } {
  if (!profile) return { filled: 0, shared: false };
  let filled = 0;
  let shared = false;

  const countText = (f?: { value: string | null; visibility: string }) => {
    if (f && typeof f.value === 'string' && f.value.trim()) {
      filled += 1;
      if (f.visibility === 'Shared') shared = true;
    }
  };
  const countList = (f?: { values: string[]; visibility: string }) => {
    if (f && f.values.some((v) => v.trim())) {
      filled += 1;
      if (f.visibility === 'Shared') shared = true;
    }
  };

  switch (key) {
    case 'whoIAm':
      Object.values(profile.whoIAm).forEach((f) => countText(f as never));
      break;
    case 'whatILike':
      Object.values(profile.whatILike).forEach((f) => countList(f as never));
      break;
    case 'favorites':
      Object.entries(profile.favorites).forEach(([k, v]) => {
        if (k !== 'favoriteColorHex') countText(v as never);
      });
      break;
    case 'howToHelpMe': {
      const h = profile.howToHelpMe;
      countText(h.whenHavingDifficultDay); countText(h.whatToAvoid);
      countText(h.preferredReassurance); countText(h.howToApproachMe);
      countText(h.howIAskForSpace); countText(h.whatHelpsMeRecover); countText(h.neverAssume);
      if (h.supportOptions.length > 0 || h.customOptions.some((v) => v.trim())) {
        filled += 1;
        if (h.optionsVisibility === 'Shared') shared = true;
      }
      break;
    }
    case 'thingsToKnow':
      Object.values(profile.thingsToKnow).forEach((f) => countList(f as never));
      break;
    case 'boundaries':
      profile.boundaries.categories.forEach((c) => {
        const has = c.comfortableWith.some((v) => v.trim()) ||
          c.askBefore.some((v) => v.trim()) || c.pleaseDont.some((v) => v.trim());
        if (has) {
          filled += 1;
          if (c.visibility === 'Shared') shared = true;
        }
      });
      break;
    case 'littleThings':
      Object.values(profile.littleThings).forEach((f) => countText(f as never));
      break;
  }

  return { filled, shared };
}

export function SupportProfileHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, loading, refresh } = useOwnSupportProfile();

  // Prefer the freshly-computed local completion so edits reflect immediately;
  // fall back to the server value.
  const completion = useMemo(
    () => (profile ? calculateCompletion(profile) : null),
    [profile],
  );

  const openSection = useCallback(
    (section: SectionKey) => navigation.navigate('SupportSectionEditor', { section }),
    [navigation],
  );

  const openPartner = useCallback(
    () => navigation.navigate('PartnerSupportProfile'),
    [navigation],
  );

  const percentage = completion?.percentage ?? profile?.completion.percentage ?? 0;
  const completedSections = completion?.completedSections ?? profile?.completion.completedSections ?? 0;

  // This screen is the root of the SupportProfile stack, reached by switching to
  // a hidden tab from Settings — so there's nothing to pop within this stack.
  // Back should return to the Settings tab we came from.
  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('Profile');
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="How to Know Me" onBack={handleBack} />

      {loading && !profile ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.gold} />
          }
        >
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>
              {completedSections} of 7 chapters written
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percentage}%` }]} />
            </View>
            <Text style={styles.progressPct}>{percentage}% complete</Text>
          </View>

          <Pressable
            style={styles.previewLink}
            onPress={openPartner}
            accessibilityRole="button"
            accessibilityLabel="See your partner's profile"
          >
            <Text style={styles.previewLinkText}>See your partner’s handbook →</Text>
          </Pressable>

          {SECTIONS.map((section) => {
            const { filled, shared } = sectionSummary(profile, section.key);
            return (
              <Pressable
                key={section.key}
                style={styles.sectionCard}
                onPress={() => openSection(section.key)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${section.title}`}
              >
                <View style={styles.sectionMain}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionBlurb}>{section.blurb}</Text>
                  <Text style={styles.sectionMeta}>
                    {filled > 0
                      ? `${filled} ${filled === 1 ? 'answer' : 'answers'}${shared ? ' · Shared' : ' · Private'}`
                      : 'Not started yet'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          })}

          <Text style={styles.footNote}>
            Every answer is private until you choose to share it. You can change any answer’s
            privacy at any time.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  progressCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  progressTitle: { ...typography.bodyMedium, color: colors.neutral, marginBottom: spacing.sm },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.gold },
  progressPct: { ...typography.bodySm, color: colors.gold, marginTop: spacing.sm },

  previewLink: { paddingVertical: spacing.sm, marginBottom: spacing.sm },
  previewLinkText: { ...typography.bodyMedium, color: colors.gold, fontSize: 15 },

  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionMain: { flex: 1 },
  sectionTitle: { ...typography.headlineSm, color: colors.neutral, fontSize: 18 },
  sectionBlurb: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 4 },
  sectionMeta: { ...typography.label, color: colors.gold, marginTop: 8, fontSize: 11 },
  chevron: { color: colors.neutralMuted, fontSize: 26, marginLeft: spacing.sm },

  footNote: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    marginTop: spacing.md,
    lineHeight: 19,
  },
});
