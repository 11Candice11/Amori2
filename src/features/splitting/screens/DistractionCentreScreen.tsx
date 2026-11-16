/**
 * Screen — Amori Distraction Centre.
 * Low-stakes cozy escapes to gently shift focus. No heavy emotional work.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SplittingStackParamList } from '../../../navigation/SplittingStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import {
  SplittingHeader,
  StatusPill,
  SectionLabel,
  PrimaryButton,
  SecondaryButton,
  ShieldIcon,
  SparkleIcon,
  PlayIcon,
} from '../components';
import { DISTRACTION_ESCAPES } from '../utils/splittingData';
import { EMPTY_FLOW_STATE } from '../types/splitting.types';
import { useSaveGroundingOnLeave } from '../hooks/useLeaveSplittingFlow';

type Nav = NativeStackNavigationProp<SplittingStackParamList, 'DistractionCentre'>;
type Rt = RouteProp<SplittingStackParamList, 'DistractionCentre'>;

export function DistractionCentreScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const flow = route.params?.flow ?? EMPTY_FLOW_STATE;

  // Leaving this screen after the Inward Check saves the grounding as history.
  useSaveGroundingOnLeave(flow, { actions: ['Distraction'] });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SplittingHeader eyebrow="Distraction Centre" subtitle="Sanctuary Home" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatusPill label="Grounding rest" />

        <Text style={styles.title}>I've got you.</Text>
        <Text style={styles.subtitle}>
          Let's get your brain somewhere else for a bit. No heavy emotional work right now — just quiet, cozy delight.
        </Text>

        <View style={styles.featuredCard}>
          <View style={styles.featuredHead}>
            <Text style={styles.featuredEyebrow}>Recommended first</Text>
            <View style={styles.featuredMeta}>
              <Text style={styles.featuredMetaText}>5 mins · Light</Text>
            </View>
          </View>
          <Text style={styles.featuredTitle}>Quiz About Us</Text>
          <Text style={styles.featuredBody}>
            Test how well we know our funny little quirks, odd late-night snack habits, and inside jokes. Pure smile material.
          </Text>
          <Text style={styles.featuredFoot}>30 cozy prompts ready to reveal</Text>
        </View>

        <SectionLabel label="Pick a gentle escape" hint="Tap to launch instantly" />

        {DISTRACTION_ESCAPES.map(escape => (
          <Pressable
            key={escape.id}
            style={styles.escapeCard}
            accessibilityRole="button"
            accessibilityLabel={escape.title}
            android_ripple={{ color: 'rgba(139,111,58,0.08)' }}
          >
            <View style={styles.escapeIcon}>
              <SparkleIcon color={colors.primaryLight} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.escapeTitleRow}>
                <Text style={styles.escapeTitle}>{escape.title}</Text>
                <Text style={styles.playLabel}>Play</Text>
              </View>
              <Text style={styles.escapeSub}>{escape.subtitle}</Text>
              <View style={styles.tagRow}>
                {escape.tags.map(t => (
                  <View key={t} style={styles.tag}>
                    <Text style={styles.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Pressable>
        ))}

        <View style={styles.protectedNote}>
          <ShieldIcon color={colors.primaryLight} size={18} />
          <Text style={styles.protectedNoteText}>
            You are in protected Distraction mode. When you exit, we'll gently check in on how you're feeling. Take all the time you need.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <PrimaryButton
          label={'Start "Quiz About Us"'}
          icon={<PlayIcon color={colors.ctaText} size={16} />}
          onPress={() => navigation.navigate('SafeTransition', { flow })}
        />
        <SecondaryButton label="← Back to Splitting Menu" onPress={() => navigation.navigate('InwardCheck', { flow })} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.headline, color: colors.neutral, marginTop: spacing.md, fontSize: 28 },
  subtitle: { ...typography.body, color: colors.neutralMuted, marginTop: spacing.sm },

  featuredCard: {
    backgroundColor: 'rgba(139,111,58,0.1)',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(139,111,58,0.3)',
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  featuredHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featuredEyebrow: { ...typography.label, color: colors.gold, fontSize: 10 },
  featuredMeta: { backgroundColor: 'rgba(6,78,59,0.6)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  featuredMetaText: { ...typography.bodySm, color: colors.primaryLight, fontSize: 11 },
  featuredTitle: { ...typography.headlineSm, color: colors.neutral, fontSize: 20, marginTop: spacing.sm },
  featuredBody: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 6, lineHeight: 19 },
  featuredFoot: { ...typography.bodySm, color: colors.gold, marginTop: spacing.md, fontSize: 12 },

  escapeCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 12,
  },
  escapeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(6,78,59,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escapeTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  escapeTitle: { ...typography.bodyMedium, color: colors.neutral, fontSize: 15, flex: 1 },
  playLabel: { ...typography.label, color: colors.gold, fontSize: 11 },
  escapeSub: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 4, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { backgroundColor: 'rgba(6,78,59,0.6)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 10 },

  protectedNote: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(6,78,59,0.3)',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  protectedNoteText: { ...typography.bodySm, color: colors.neutralMuted, flex: 1, lineHeight: 18 },

  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
});
