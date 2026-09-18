import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../shared/theme';
import { formatDuration, formatDateTime } from '../utils/errorMessages';
import type { IncidentSla } from '../types/incident.types';

type Props = {
  sla: IncidentSla;
  remainingSeconds: number;
};

export function SlaCard({ sla, remainingSeconds }: Props) {
  const isOverdue = remainingSeconds <= 0;
  const totalSeconds = (new Date(sla.dueAt).getTime() - new Date(sla.createdAt).getTime()) / 1000;
  const elapsed = totalSeconds - remainingSeconds;
  const progress = totalSeconds > 0 ? Math.min(1, Math.max(0, elapsed / totalSeconds)) : 0;

  const trackColor = isOverdue
    ? '#B34040'
    : progress > 0.75
    ? '#DC823C'
    : colors.rhythmComplete;

  const label = isOverdue ? 'Overdue' : 'On Track';
  const labelColor = isOverdue ? '#B34040' : colors.rhythmComplete;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.cardTitle}>Relationship Care SLA</Text>
        <View style={[styles.statusPill, { backgroundColor: `${trackColor}22` }]}>
          <Text style={[styles.statusText, { color: labelColor }]}>{label}</Text>
        </View>
      </View>

      <Text style={[styles.remaining, { color: trackColor }]}>
        {isOverdue ? 'Overdue' : formatDuration(remainingSeconds)} remaining
      </Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: trackColor }]} />
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaText}>Priority: {sla.priority}</Text>
        <Text style={styles.metaText}>Due: {formatDateTime(sla.dueAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 13,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    ...typography.label,
    fontSize: 9,
  },
  remaining: {
    ...typography.headlineSm,
    fontSize: 22,
    marginBottom: 10,
  },
  track: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
  },
});
