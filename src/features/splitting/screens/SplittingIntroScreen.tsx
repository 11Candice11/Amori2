/**
 * Screen 1 — "I'm Splitting" entry point.
 * A calm landing that slows things down and offers to work through it.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SplittingStackParamList } from '../../../navigation/SplittingStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import {
  SplittingHeader,
  StatusPill,
  PrimaryButton,
  TextButton,
  NoteCallout,
  PulseCircle,
  MoonIcon,
  LeafIcon,
  HeartIcon,
  RefreshIcon,
} from '../components';
import { EMPTY_FLOW_STATE, type SplittingFlowState } from '../types/splitting.types';
import { PARTNER_NAME } from '../utils/splittingData';

type Nav = NativeStackNavigationProp<SplittingStackParamList, 'SplittingIntro'>;

export function SplittingIntroScreen() {
  const navigation = useNavigation<Nav>();
  const flow: SplittingFlowState = { ...EMPTY_FLOW_STATE };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SplittingHeader eyebrow="Splitting Anchor" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatusPill label="Safe space protocol active" />

        <View style={styles.hero}>
          <PulseCircle
            size={220}
            durationMs={5000}
            haptics
            centerContent={
              <View style={styles.heroBadge}>
                <RefreshIcon color={colors.tertiary} size={22} />
              </View>
            }
            label="Hold"
            sublabel="SOFTEN YOUR SHOULDERS"
          />
        </View>

        <Text style={styles.title}>I'm Splitting</Text>
        <Text style={styles.subtitle}>
          Let's slow things down for a moment. You don't have to figure everything out right now.
        </Text>

        <NoteCallout icon={<MoonIcon color={colors.gold} size={18} />} style={styles.noteSpacing}>
          <Text style={styles.noteTitle}>No pressure, no judgments</Text>
          <Text style={styles.noteBody}>Whatever you feel right now is entirely valid to hold.</Text>
        </NoteCallout>

        <View style={styles.actions}>
          <PrimaryButton
            label="Let's work through it"
            icon={<LeafIcon color={colors.ctaText} size={18} />}
            onPress={() => navigation.navigate('GroundingCheckpoint', { flow })}
          />
          <TextButton label="Not now" onPress={() => navigation.goBack()} />
        </View>

        <View style={styles.footer}>
          <HeartIcon color={colors.emergency} size={14} />
          <Text style={styles.footerText}>{PARTNER_NAME} is always here, whenever you're ready.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  hero: { marginVertical: spacing.lg },
  heroBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(197,163,101,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.headline, color: colors.neutral, textAlign: 'center', fontSize: 30 },
  subtitle: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  noteSpacing: { marginTop: spacing.lg },
  noteTitle: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 15 },
  noteBody: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 3 },
  actions: { marginTop: spacing.xl, gap: spacing.xs },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  footerText: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 12 },
});
