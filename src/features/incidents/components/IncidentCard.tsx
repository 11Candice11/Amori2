/**
 * IncidentCard — list item card for incidents.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, typography } from '../../../shared/theme';
import { CategoryBadge, OverdueBadge, PriorityBadge, StatusBadge } from './IncidentBadges';
import type { IncidentSummaryItem } from '../types/incident.types';

function formatRelativeDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'Yesterday';
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatDueDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffMs < 0) return 'Overdue';
    if (diffH < 1) return 'Due soon';
    if (diffH < 24) return `Due in ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `Due in ${diffD}d`;
  } catch {
    return null;
  }
}

function ChevronIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={colors.neutralMuted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type IncidentCardProps = {
  incident: IncidentSummaryItem;
  onPress: (id: string) => void;
};

export function IncidentCard({ incident, onPress }: IncidentCardProps) {
  const dueLabel = formatDueDate(incident.dueAt);

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(incident.id)}
      android_ripple={{ color: 'rgba(197,163,101,0.08)' }}
      accessibilityRole="button"
      accessibilityLabel={`Incident: ${incident.title}`}
    >
      {/* Top row: incident number + priority + status */}
      <View style={styles.topRow}>
        <Text style={styles.incidentNumber}>#{incident.id.slice(0, 8).toUpperCase()}</Text>
        <View style={styles.badgeRow}>
          <PriorityBadge priority={incident.priority} />
          <StatusBadge status={incident.status} />
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{incident.title}</Text>

      {/* Category row */}
      <View style={styles.categoryRow}>
        <CategoryBadge category={incident.category} />
        {incident.isOverdue && <OverdueBadge />}
      </View>

      {/* Footer: assignee + created + due */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {incident.assignedTo ? (
            <Text style={styles.assignee}>⚡ {incident.assignedTo.name}</Text>
          ) : (
            <Text style={styles.unassigned}>Unassigned</Text>
          )}
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{formatRelativeDate(incident.createdAt)}</Text>
        </View>
        <View style={styles.footerRight}>
          {dueLabel ? (
            <Text style={[styles.due, incident.isOverdue && styles.dueOverdue]}>{dueLabel}</Text>
          ) : null}
          <ChevronIcon />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incidentNumber: {
    ...typography.label,
    color: colors.gold,
    fontSize: 9,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  title: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 15,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignee: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 11,
  },
  unassigned: {
    ...typography.bodySm,
    color: 'rgba(253,252,240,0.3)',
    fontSize: 11,
  },
  metaDot: {
    color: colors.neutralMuted,
    fontSize: 10,
  },
  meta: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 11,
  },
  due: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 11,
  },
  dueOverdue: {
    color: '#B34040',
  },
});
