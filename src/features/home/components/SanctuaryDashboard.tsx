/**
 * SanctuaryDashboard — the redesigned Home dashboard.
 *
 * Layout (top → bottom), matching the design reference:
 *   1. Top bar        — heart glyph · "<partner> · CONNECTED" pill · avatar
 *   2. Hero greeting  — "Evening, <you> & <partner>" + SANCTUARY label
 *   3. Stats row      — days together | days till anniversary
 *   4. Partner state  — partner avatar, "…'S STATE", updated time, mood label
 *   5. Check-in row   — "Check In →" prompt with calendar glyph
 *   6. Attunement 2×2 — Send hug · Distraction · Log Incident · Not okay
 *   7. Daily Artifact — sealed "Mystery Booster Pack" card
 *
 * All colors come from theme tokens so the card set repaints correctly across
 * the light/dark modes and the botanical/gold variants.
 */
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { useCountdown } from '../../splitting/hooks/useCountdown';
import { EmergencyBanner } from './EmergencyBanner';

const artifactImage = require('../../../../images/card.png');

// ─── Icons ────────────────────────────────────────────────────────────────────

function HeartIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C12 21 3 14.5 3 8.5a4.5 4.5 0 018.5-2.12A4.5 4.5 0 0121 8.5C21 14.5 12 21 12 21z"
        stroke={colors.gold}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4.5} width={18} height={17} rx={3} stroke={colors.gold} strokeWidth={1.5} />
      <Path d="M3 9h18M8 2.5v4M16 2.5v4" stroke={colors.gold} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function HugIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20C12 20 4 15 4 9.2A3.7 3.7 0 0112 6.6 3.7 3.7 0 0120 9.2C20 15 12 20 12 20z"
        stroke={colors.gold}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DistractionIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l2 5 5 .5-3.8 3.3 1.2 4.9L12 14.9 7.6 16.7l1.2-4.9L5 8.5 10 8z"
        stroke={colors.gold}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LogIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3.5h9l3 3v14H6z" stroke={colors.gold} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M9 9h6M9 13h6M9 17h4" stroke={colors.gold} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function NotOkayIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={colors.emergency} strokeWidth={1.6} />
      <Path d="M12 7.5v5.5M12 16.2h.01" stroke={colors.emergency} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function ArrowIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke={colors.gold} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={10} width={14} height={10} rx={2.5} stroke={colors.ctaText} strokeWidth={1.6} />
      <Path d="M8 10V7.5a4 4 0 018 0V10" stroke={colors.ctaText} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function VaultIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={15} rx={3} stroke={colors.ctaText} strokeWidth={1.6} />
      <Path d="M3 9h18" stroke={colors.ctaText} strokeWidth={1.6} />
      <Path d="M12 12.5v3.5M10.5 14h3" stroke={colors.ctaText} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function SparkleIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" fill={colors.gold} />
      <Circle cx={18.5} cy={5.5} r={1.3} fill={colors.gold} />
      <Circle cx={5.5} cy={16.5} r={1} fill={colors.gold} />
    </Svg>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function AttunementItem({
  icon,
  title,
  onPress,
  danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.attItem, pressed && styles.pressed]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(197,163,101,0.12)' }}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.attItemHeader}>
        {icon}
        <View style={[styles.attDot, danger && styles.attDotDanger]} />
      </View>
      <Text style={styles.attItemTitle}>{title}</Text>
    </Pressable>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export type SanctuaryDashboardProps = {
  /** The current user's display name (falls back to a gentle placeholder). */
  userName?: string | null;
  partnerName: string;
  isPartnerOnline: boolean;
  relationshipDays: number;
  daysTillAnniversary: number;
  /** Time-of-day word used in the greeting, e.g. "Evening". */
  timeOfDay: string;
  /** Partner's mood label, e.g. "Content & Grounded". */
  partnerMoodLabel: string | null;
  /** Relative time since the partner's check-in, e.g. "24m ago". */
  partnerUpdatedAgo: string | null;
  /** The current user's own mood label from today's check-in, if any. */
  userMoodLabel: string | null;
  /**
   * Whose active self-regulation ("space") window to show, or null when none.
   * 'self' = the current user started it; 'partner' = the partner did.
   */
  spaceWindowOwner: 'self' | 'partner' | null;
  /**
   * ISO end-time of the active self-regulation window, or null when there's no
   * active window. Drives a shared live countdown shown on BOTH dashboards.
   */
  spaceWindowEndsAt: string | null;
  /** Whether the current user has checked in today. */
  hasMoodToday: boolean;
  onCheckIn: () => void;
  onHug: () => void;
  onDistraction: () => void;
  onLogIncident: () => void;
  onNotOkay: () => void;
  onOpenArtifact: () => void;
  /** Whether today's Daily Artifact has already been opened. */
  artifactOpened: boolean;
  /** Navigate to the Hearth Vault (shown after the artifact is opened). */
  onViewVault: () => void;
};

export function SanctuaryDashboard({
  userName,
  partnerName,
  isPartnerOnline,
  relationshipDays,
  daysTillAnniversary,
  timeOfDay,
  partnerMoodLabel,
  partnerUpdatedAgo,
  userMoodLabel,
  spaceWindowOwner,
  spaceWindowEndsAt,
  hasMoodToday,
  onCheckIn,
  onHug,
  onDistraction,
  onLogIncident,
  onNotOkay,
  onOpenArtifact,
  artifactOpened,
  onViewVault,
}: SanctuaryDashboardProps) {
  const partner = partnerName || 'your love';
  const you = userName || 'You';
  const connectedLabel = `${partner.toUpperCase()} · ${isPartnerOnline ? 'CONNECTED' : 'AWAY'}`;

  // Shared self-regulation window: whoever started the space, both people see
  // the same live countdown on their dashboard.
  const spaceWindowMs = useMemo(() => {
    if (!spaceWindowEndsAt) return undefined;
    const parsed = Date.parse(spaceWindowEndsAt);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [spaceWindowEndsAt]);
  const spaceWindow = useCountdown(spaceWindowMs);

  return (
    <View>
      {/* 1 ── Top bar */}
      <View style={styles.topBar}>
        <View style={styles.iconCircle}>
          <HeartIcon size={18} />
        </View>

        <View style={styles.connectedPill}>
          <View style={[styles.connectedDot, !isPartnerOnline && styles.connectedDotAway]} />
          <Text style={styles.connectedText}>{connectedLabel}</Text>
        </View>

        <View style={styles.avatarRing}>
          <View style={styles.avatarInner} />
        </View>
      </View>

      {/* 2 ── Hero greeting */}
      <View style={styles.heroRow}>
        <Text style={styles.heroGreeting}>
          {timeOfDay}, <Text style={styles.heroNames}>{you} &amp; {partner}</Text>
        </Text>
        <Text style={styles.heroLabel}>SANCTUARY</Text>
      </View>

      {/* 3 ── Stats row */}
      <View style={styles.statsCard}>
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{relationshipDays.toLocaleString()}</Text>
          <Text style={styles.statLabel}>DAYS TOGETHER</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={[styles.statCol, styles.statColRight]}>
          <Text style={styles.statValue}>{daysTillAnniversary}</Text>
          <Text style={styles.statLabel}>DAYS TILL ANNIVERSARY</Text>
        </View>
      </View>

      {/* 4 ── Partner state */}
      <View style={styles.partnerCard}>
        <View style={styles.partnerAvatar} />
        <View style={styles.partnerTextWrap}>
          <View style={styles.partnerHeaderRow}>
            <Text style={styles.partnerName}>{partner.toUpperCase()}'S STATE</Text>
            {partnerUpdatedAgo ? (
              <Text style={styles.partnerUpdated}>Updated {partnerUpdatedAgo}</Text>
            ) : null}
          </View>
          <Text style={styles.partnerMood}>
            {partnerMoodLabel ?? 'No recent check-in'}
          </Text>
        </View>
      </View>

      {/* 4b ── Self-regulation window (shared countdown, shown on both dashboards) */}
      {spaceWindow.active && !spaceWindow.finished ? (
        <View style={styles.windowCard}>
          <View style={styles.windowTextWrap}>
            <Text style={styles.windowLabel}>
              {spaceWindowOwner === 'self' ? "YOU'RE TAKING SPACE" : `${partner.toUpperCase()} IS TAKING SPACE`}
            </Text>
            <Text style={styles.windowSub}>
              {spaceWindowOwner === 'self'
                ? 'Your quiet moment. There\u2019s no rush to come back.'
                : 'Holding a quiet moment. You are their safe harbor.'}
            </Text>
          </View>
          <View style={styles.windowTimePill}>
            <Text style={styles.windowTime}>{spaceWindow.label}</Text>
            <Text style={styles.windowTimeCaption}>left</Text>
          </View>
        </View>
      ) : null}

      {/* 5 ── Check-in row */}
      <Pressable
        style={({ pressed }) => [styles.checkInRow, pressed && styles.pressed]}
        onPress={onCheckIn}
        android_ripple={{ color: 'rgba(197,163,101,0.12)' }}
        accessibilityRole="button"
        accessibilityLabel={hasMoodToday ? 'Update your check-in' : 'Check in'}
      >
        <View style={styles.checkInTextWrap}>
          <View style={styles.checkInTitleRow}>
            <Text style={hasMoodToday && userMoodLabel ? styles.checkInStateLabel : styles.checkInTitle}>
              {hasMoodToday && userMoodLabel ? 'YOUR STATE' : hasMoodToday ? 'Checked In' : 'Check In'}
            </Text>
            <ArrowIcon />
          </View>
          {hasMoodToday && userMoodLabel ? (
            <Text style={styles.checkInMood}>{userMoodLabel}</Text>
          ) : null}
          <Text style={styles.checkInSubtitle}>
            {hasMoodToday
              ? 'Tap to update how you\u2019re feeling'
              : `Tap to record your ${timeOfDay.toLowerCase()} state`}
          </Text>
        </View>
        <View style={styles.checkInIcon}>
          <CalendarIcon />
        </View>
      </Pressable>

      {/* Emergency banner — launches the I'm Splitting grounding flow */}
      <EmergencyBanner onPress={onNotOkay} />

      {/* 6 ── Attunement grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ATTUNEMENT</Text>
        <Text style={styles.sectionAction}>Direct Touch</Text>
      </View>
      <View style={styles.attGrid}>
        <View style={styles.attRow}>
          <AttunementItem icon={<HugIcon />} title="Send hug" onPress={onHug} />
          <AttunementItem icon={<DistractionIcon />} title="Distraction" onPress={onDistraction} />
        </View>
        <View style={styles.attRow}>
          <AttunementItem icon={<LogIcon />} title="Log Incident" onPress={onLogIncident} />
          <AttunementItem icon={<NotOkayIcon />} title="Not okay" onPress={onNotOkay} danger />
        </View>
      </View>

      {/* 7 ── Daily artifact */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>DAILY ARTIFACT</Text>
        <Text style={styles.sectionAction}>{artifactOpened ? 'Opened' : '1 Available'}</Text>
      </View>
      <View style={styles.artifactCard}>
        <View style={styles.artifactBadge}>
          <Text style={styles.artifactBadgeText}>
            SERIES 01 · {artifactOpened ? 'OPENED' : 'UNOPENED'}
          </Text>
        </View>

        <View style={styles.artifactArtWrap}>
          <Image source={artifactImage} style={styles.artifactArt} resizeMode="contain" />
          {!artifactOpened ? (
            <>
              <View style={styles.artifactArtDim} />
              <View style={styles.artifactSparkle}>
                <SparkleIcon />
              </View>
            </>
          ) : null}
        </View>

        <Text style={styles.artifactTitle}>Mystery Booster Pack</Text>

        {artifactOpened ? (
          <Pressable
            style={({ pressed }) => [styles.artifactBtn, pressed && styles.pressed]}
            onPress={onViewVault}
            android_ripple={{ color: 'rgba(10,20,15,0.15)' }}
            accessibilityRole="button"
            accessibilityLabel="View vault"
          >
            <VaultIcon />
            <Text style={styles.artifactBtnText}>VIEW VAULT</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.artifactBtn, pressed && styles.pressed]}
            onPress={onOpenArtifact}
            android_ripple={{ color: 'rgba(10,20,15,0.15)' }}
            accessibilityRole="button"
            accessibilityLabel="Tear open pack"
          >
            <LockIcon />
            <Text style={styles.artifactBtnText}>TEAR OPEN PACK</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  connectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  connectedDotAway: {
    backgroundColor: colors.neutralSubtle,
  },
  connectedText: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  avatarInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceCard,
  },

  // Hero
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  heroGreeting: {
    ...typography.headline,
    color: colors.neutral,
    flexShrink: 1,
    paddingRight: spacing.sm,
  },
  heroNames: {
    ...typography.headline,
    color: colors.gold,
    fontStyle: 'italic',
  },
  heroLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
    letterSpacing: 1,
  },

  // Stats
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statCol: {
    flex: 1,
  },
  statColRight: {
    alignItems: 'flex-end',
  },
  statValue: {
    ...typography.headline,
    color: colors.neutral,
    fontSize: 26,
  },
  statLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },

  // Partner state
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.background,
  },
  partnerTextWrap: {
    flex: 1,
    gap: 3,
  },
  partnerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partnerName: {
    ...typography.label,
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  partnerUpdated: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    fontSize: 11,
  },
  partnerMood: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
  },

  // Partner self-regulation window (shared countdown)
  windowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(197,163,101,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.3)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  windowTextWrap: { flex: 1, gap: 3 },
  windowLabel: {
    ...typography.label,
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  windowSub: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 12, lineHeight: 16 },
  windowTimePill: { alignItems: 'center', minWidth: 64 },
  windowTime: {
    ...typography.headlineSm,
    color: colors.gold,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  windowTimeCaption: { ...typography.label, color: colors.neutralMuted, fontSize: 9 },

  // Check-in row
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  checkInTextWrap: {
    flex: 1,
    gap: 3,
  },
  checkInTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkInTitle: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 16,
  },
  checkInStateLabel: {
    ...typography.label,
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  checkInMood: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
  },
  checkInSubtitle: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 13,
  },
  checkInIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
    letterSpacing: 1,
  },
  sectionAction: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 12,
  },

  // Attunement grid
  attGrid: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  attRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  attItem: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 92,
    justifyContent: 'space-between',
  },
  attItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  attDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
    opacity: 0.6,
  },
  attDotDanger: {
    backgroundColor: colors.emergency,
    opacity: 1,
  },
  attItemTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 15,
    marginTop: spacing.sm,
  },

  // Daily artifact
  artifactCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  artifactBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  artifactBadgeText: {
    ...typography.label,
    color: colors.gold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  artifactArtWrap: {
    width: 128,
    height: 168,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gold,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artifactArt: {
    ...StyleSheet.absoluteFillObject,
  },
  artifactArtDim: {
    ...StyleSheet.absoluteFillObject,
    // Light scrim so the card.png art reads while keeping the sparkle legible.
    backgroundColor: 'rgba(6, 18, 10, 0.2)',
  },
  artifactSparkle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 18, 14, 0.7)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  artifactTitle: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 20,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  artifactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    paddingVertical: spacing.md,
  },
  artifactBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
