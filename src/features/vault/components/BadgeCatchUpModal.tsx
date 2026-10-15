/**
 * BadgeCatchUpModal — the one-time "you've already earned N badges" summary.
 *
 * Shown once, the first time a user opens the app after points and badge
 * saving moved to the server (see BadgeCatchUpHost). It lists the badges they
 * had already unlocked but never saved, and the points credited for their past
 * activity, with a single "Save all" that saves every badge in one request.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../shared/theme';
import { BadgeGrid } from '../../../shared/components/BadgeGrid';
import type { Badge } from '../../../constants/badges';
import type { BackfillLine } from '../../../services/api/pointsService';

/** How many badges to show before collapsing the rest into "+N more". */
const MAX_SHOWN = 9;

/** Friendly wording for each backfilled activity, singular / plural. */
const ACTIVITY_LABELS: Record<string, [string, string]> = {
  HugSent: ['hug sent', 'hugs sent'],
  HugHeld: ['hug held', 'hugs held'],
  MorningCheckIn: ['day checked in', 'days checked in'],
  SosFlowCompleted: ['grounding session finished', 'grounding sessions finished'],
  VisionAdded: ['vision added', 'visions added'],
  BucketListAdded: ['bucket-list item added', 'bucket-list items added'],
  TodoAdded: ['to-do added', 'to-dos added'],
  CardCollected: ['gift sent', 'gifts sent'],
};

function activityLabel(line: BackfillLine): string {
  const labels = ACTIVITY_LABELS[line.activityType];
  if (!labels) return `${line.count} × ${line.activityType}`;
  return `${line.count} ${line.count === 1 ? labels[0] : labels[1]}`;
}

type Props = {
  visible: boolean;
  badges: Badge[];
  backfill: BackfillLine[];
  onSaveAll: () => Promise<void>;
  onDismiss: () => void;
};

export function BadgeCatchUpModal({ visible, badges, backfill, onSaveAll, onDismiss }: Props) {
  const [saving, setSaving] = useState(false);

  const count = badges.length;
  const badgePoints = badges.reduce((sum, b) => sum + b.pointsReward, 0);
  const backfillPoints = backfill.reduce((sum, l) => sum + l.points, 0);
  const shown = badges.slice(0, MAX_SHOWN);
  const hiddenCount = count - shown.length;

  const title =
    count > 0
      ? `You've already earned ${count} ${count === 1 ? 'badge' : 'badges'}`
      : 'Your history counts';

  const handleSaveAll = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSaveAll();
    } catch {
      // The host already showed the error; stay open so they can retry.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.kicker}>WELCOME BACK</Text>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>

            {backfillPoints > 0 && (
              <View style={styles.section}>
                <Text style={styles.body}>
                  We've added <Text style={styles.gold}>{backfillPoints} points</Text> for everything
                  you've done together so far:
                </Text>
                {backfill.map(line => (
                  <View key={line.activityType} style={styles.lineRow}>
                    <Text style={styles.lineLabel}>{activityLabel(line)}</Text>
                    <Text style={styles.linePoints}>+{line.points}</Text>
                  </View>
                ))}
              </View>
            )}

            {count > 0 && (
              <View style={styles.section}>
                <Text style={styles.body}>
                  {count === 1 ? 'This badge is' : 'These badges are'} ready to keep in your vault.
                  Saving {count === 1 ? 'it' : 'them'} earns{' '}
                  <Text style={styles.gold}>+{badgePoints} points</Text>.
                </Text>
                <BadgeGrid
                  badges={shown.map(b => b.id)}
                  unlockedBadges={new Set(shown.map(b => b.id))}
                  variant="small"
                  showNames
                  numColumns={3}
                />
                {hiddenCount > 0 && <Text style={styles.more}>+{hiddenCount} more</Text>}
              </View>
            )}
          </ScrollView>

          {count > 0 ? (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.primary,
                  pressed && styles.pressed,
                  saving && styles.disabled,
                ]}
                onPress={handleSaveAll}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={`Save all ${count} badges to your vault, earns ${badgePoints} points`}
                accessibilityState={{ disabled: saving, busy: saving }}
              >
                {saving ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.primaryText}>Save all · +{badgePoints} pts</Text>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                onPress={onDismiss}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Later. You can save badges from Achievements any time."
              >
                <Text style={styles.secondaryText}>Later</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              onPress={onDismiss}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Lovely</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: colors.surfaceCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.goldTint15,
    paddingBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  kicker: {
    ...typography.label,
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.headlineSm,
    color: colors.neutral,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  gold: {
    color: colors.gold,
    fontWeight: '600',
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  lineLabel: {
    ...typography.body,
    color: colors.neutral,
  },
  linePoints: {
    ...typography.bodySemiBold,
    color: colors.gold,
  },
  more: {
    ...typography.label,
    color: colors.neutralMuted,
    textAlign: 'center',
  },
  primary: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.gold,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    ...typography.bodySemiBold,
    color: colors.background,
    fontSize: 16,
  },
  secondary: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
  },
  secondaryText: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
});
