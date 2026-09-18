/**
 * CedarKeepsake — Sealed box card from partner.
 * Tap-to-unlock interaction with padlock icon.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';

function LockIcon({ unlocked = false }: { unlocked?: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={11} width={18} height={12} rx={3} stroke={colors.gold} strokeWidth={1.5} />
      {unlocked ? (
        <Path
          d="M8 11V7a4 4 0 014-4 4 4 0 014 4"
          stroke={colors.neutralMuted}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      ) : (
        <Path
          d="M8 11V7a4 4 0 018 0v4"
          stroke={colors.gold}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}

function KeyIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
        stroke={colors.gold}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type CedarKeepsakeProps = {
  senderName?: string;
  arrivalTime?: string;
  hint?: string;
  onUnlock?: () => void;
};

export function CedarKeepsake({
  senderName = 'Cat',
  arrivalTime = '07:15 AM',
  hint = `${senderName} pressed a sweet thought & secret photo inside`,
  onUnlock,
}: CedarKeepsakeProps) {
  const [unlocked, setUnlocked] = useState(false);

  const handleUnlock = () => {
    setUnlocked(true);
    onUnlock?.();
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconLabel}>
          <LockIcon unlocked={unlocked} />
          <View>
            <Text style={styles.sectionLabel}>LEFT AT DAWN</Text>
            <Text style={styles.title}>Sealed Box from {senderName}</Text>
          </View>
        </View>
        <Text style={styles.sealedBadge}>Sealed & Untouched</Text>
      </View>

      <Text style={styles.arrivalText}>
        {senderName} walked past the trees at sunrise and tucked this away for your awakening
      </Text>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Unlock row */}
      <Pressable
        style={({ pressed }) => [styles.unlockRow, pressed && styles.pressed]}
        onPress={handleUnlock}
        android_ripple={{ color: 'rgba(197,163,101,0.14)' }}
        accessibilityRole="button"
        accessibilityLabel={`Tap to unwrap morning parcel`}
        disabled={unlocked}
      >
        <View style={styles.unlockLeft}>
          <KeyIcon />
          <Text style={styles.unlockText}>
            {unlocked ? `Opened — enjoy ${senderName}'s message` : `Tap to unwrap morning parcel`}
          </Text>
        </View>
        <LockIcon unlocked={unlocked} />
      </Pressable>

      {!unlocked && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sealedBadge: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 10,
    marginLeft: spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.gold,
    fontSize: 9,
  },
  title: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 17,
  },
  arrivalText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    marginBottom: spacing.md,
    marginLeft: 28,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  unlockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unlockText: {
    ...typography.bodyMedium,
    color: colors.gold,
    fontSize: 13,
  },
  hint: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    marginTop: spacing.xs,
    marginLeft: 4,
  },
});
