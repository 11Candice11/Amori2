/**
 * VaultScreen — placeholder.
 *
 * The Hearth Vault is where saved surprises (notes, images, voice notes,
 * links, songs, etc.) live. The full experience will be dropped in later;
 * for now this is a calm placeholder reachable from the Daily Artifact card's
 * "View vault" action once the day's pack has been opened.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';

function BackChevron() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6l-6 6 6 6" stroke={colors.neutral} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function VaultGlyph() {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={15} rx={3} stroke={colors.gold} strokeWidth={1.5} />
      <Path d="M3 9h18" stroke={colors.gold} strokeWidth={1.5} />
      <Path d="M12 12.5v3.5" stroke={colors.gold} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M10.5 14h3" stroke={colors.gold} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function VaultScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
        >
          <BackChevron />
        </Text>
        <Text style={styles.headerTitle}>Hearth Vault</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.emptyState}>
          <View style={styles.glyphCircle}>
            <VaultGlyph />
          </View>
          <Text style={styles.title}>Your Vault is coming soon</Text>
          <Text style={styles.body}>
            Surprises you save — notes, photos, voice notes, links, songs — will be kept here,
            gently, for whenever you want to return to them.
          </Text>
        </View>
      </ScrollView>
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
  back: { width: 32 },
  headerTitle: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 16 },
  headerSpacer: { width: 32 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', gap: spacing.md },
  glyphCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.surfaceCard,
  },
  title: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 20,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
});
