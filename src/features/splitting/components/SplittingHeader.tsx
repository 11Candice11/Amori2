/**
 * Top bar for the splitting flow. Mirrors IncidentScreenHeader but adds the
 * brand eyebrow ("Amori / SPLITTING ANCHOR") and the "Held with Cat" chip
 * seen across the flow screens.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, typography } from '../../../shared/theme';
import { HeartIcon } from './SplittingIcons';
import { PARTNER_NAME } from '../utils/splittingData';

type Props = {
  eyebrow?: string;
  onBack?: () => void;
  showPartnerChip?: boolean;
  partnerChipLabel?: string;
};

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={colors.neutral}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SplittingHeader({
  eyebrow = 'Splitting Anchor',
  onBack,
  showPartnerChip = true,
  partnerChipLabel = `Held with ${PARTNER_NAME}`,
}: Props) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          style={styles.backBtn}
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          android_ripple={{ color: 'rgba(197,163,101,0.15)', borderless: true }}
        >
          <BackIcon />
        </Pressable>
      ) : (
        <View style={styles.backBtn} />
      )}

      <View style={styles.brandBlock}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <HeartIcon color={colors.primaryLight} size={14} />
          </View>
          <Text style={styles.brand}>Amori</Text>
        </View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>

      {showPartnerChip ? (
        <View style={styles.partnerChip}>
          <View style={styles.partnerDot} />
          <Text style={styles.partnerText} numberOfLines={1}>{partnerChipLabel}</Text>
        </View>
      ) : (
        <View style={styles.backBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBlock: { flex: 1, alignItems: 'flex-start' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(167,210,182,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { ...typography.headlineSm, color: colors.tertiary, fontSize: 18 },
  eyebrow: { ...typography.label, color: colors.neutralMuted, fontSize: 10, marginTop: 2 },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 130,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  partnerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  partnerText: { ...typography.bodySm, color: colors.neutral, fontSize: 12 },
});
