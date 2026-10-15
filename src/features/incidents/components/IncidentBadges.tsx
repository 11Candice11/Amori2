/**
 * IncidentBadges — status, priority, and category pill components.
 * Used across list items, detail headers, and history timeline.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../../shared/theme';
import type { IncidentStatus, IncidentPriority, IncidentCategory } from '../types/incident.types';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<IncidentStatus, { label: string; bg: string; text: string }> = {
  Open:             { label: 'Open',              bg: 'rgba(139,111,58,0.15)', text: '#8B6F3A' },
  Assigned:         { label: 'Assigned',           bg: 'rgba(100,160,220,0.15)', text: '#64A0DC' },
  Investigating:    { label: 'Investigating',      bg: 'rgba(120,180,140,0.15)', text: '#78B48C' },
  AwaitingResponse: { label: 'Awaiting Response',  bg: 'rgba(220,160,80,0.15)',  text: '#DCA050' },
  Resolved:         { label: 'Resolved',           bg: 'rgba(76,175,125,0.15)',  text: '#4CAF7D' },
  Closed:           { label: 'Closed',             bg: 'rgba(150,150,150,0.15)', text: '#A0A0A0' },
  Reopened:         { label: 'Reopened',           bg: 'rgba(179,64,64,0.15)',   text: '#B34040' },
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Open;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Priority badge ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<IncidentPriority, { label: string; bg: string; text: string }> = {
  Low:      { label: 'Low',      bg: 'rgba(76,175,125,0.15)',  text: '#4CAF7D' },
  Medium:   { label: 'Medium',   bg: 'rgba(139,111,58,0.15)', text: '#8B6F3A' },
  High:     { label: 'High',     bg: 'rgba(220,130,60,0.15)',  text: '#DC823C' },
  Critical: { label: 'Critical', bg: 'rgba(179,64,64,0.15)',   text: '#B34040' },
};

export function PriorityBadge({ priority }: { priority: IncidentPriority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.Low;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <View style={[styles.dot, { backgroundColor: cfg.text }]} />
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────

export function CategoryBadge({ category }: { category: IncidentCategory }) {
  return (
    <View style={styles.categoryBadge}>
      <Text style={styles.categoryText}>{category}</Text>
    </View>
  );
}

// ─── Overdue indicator ────────────────────────────────────────────────────────

export function OverdueBadge() {
  return (
    <View style={styles.overdueBadge}>
      <Text style={styles.overdueText}>Overdue</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    ...typography.label,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  categoryBadge: {
    backgroundColor: 'rgba(139,111,58,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(139,111,58,0.15)',
  },
  categoryText: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 9,
  },
  overdueBadge: {
    backgroundColor: 'rgba(179,64,64,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  overdueText: {
    ...typography.label,
    color: '#B34040',
    fontSize: 9,
  },
});
