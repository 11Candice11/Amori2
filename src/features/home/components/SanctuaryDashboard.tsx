/**
 * SanctuaryDashboard — the redesigned Home dashboard.
 *
 * Layout (top → bottom), matching the design reference:
 *   1. Top bar        — heart glyph · "<partner> · CONNECTED" pill · avatar
 *   2. Hero greeting  — "Evening, <you> & <partner>" + SANCTUARY label
 *   3. Stats row      — days together | days till anniversary
 *   4. Partner state  — partner avatar, "…'S STATE", updated time, mood label
 *   5. Check-in row   — "Check In →" prompt with calendar glyph
 *   6. Attunement 2×2 — Send hug · Distraction · Log Incident · Shared
 *   7. Daily Artifact — sealed "Mystery Booster Pack" card
 *
 * All colors come from theme tokens so the card set repaints correctly across
 * the light/dark modes and the botanical/gold variants.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { useCountdown } from '../../splitting/hooks/useCountdown';
import { getCardImage } from '../../../utils/cardSelector';
import { ActionImageIcon } from '../../../shared/components/icons/AppIcons';
import { useNotificationCount } from '../../../shared/state/notificationStore';
import { MonthlyMemoriesWidget } from '../../memories/components/MonthlyMemoriesWidget';

// ─── Icons ────────────────────────────────────────────────────────────────────

/** Animated button with 3D press effect and border image */
function AnimatedButton({
  onPress,
  children,
  style,
  accessibilityLabel,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
  accessibilityLabel?: string;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const shadowAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0.4,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
            shadowOpacity: shadowAnim.interpolate({
              inputRange: [0.4, 1],
              outputRange: [0.15, 0.3],
            }),
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

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

/** Notification bell + unread badge for the dashboard top bar. */
function DashboardBell({ onPress }: { onPress?: () => void }) {
  const count = useNotificationCount();
  const hasUnread = count > 0;
  const label = count > 99 ? '99+' : String(count);

  return (
    <Pressable
      onPress={onPress}
      style={styles.iconCircle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={hasUnread ? `Notifications, ${count} unread` : 'Notifications'}
      android_ripple={{ color: 'rgba(139,111,58,0.15)', borderless: true }}
    >
      <ActionImageIcon name="notifications" size={22} />
      {hasUnread ? (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ArrowIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke={colors.gold} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CloseIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={colors.gold} strokeWidth={1.8} strokeLinecap="round" />
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
      android_ripple={{ color: 'rgba(139,111,58,0.12)' }}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {icon}
      {danger ? <View style={styles.attDotDanger} /> : null}
    </Pressable>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export type SanctuaryDashboardProps = {
  /** The current user's display name (falls back to a gentle placeholder). */
  userName?: string | null;
  partnerName: string;
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
  /**
   * Whether the current user can control the space window (i.e. it's their own
   * session). When true, the card shows an "×" to end it early and, once it
   * elapses, an "Extend" button. The partner's window is view-only.
   */
  canControlSpaceWindow?: boolean;
  /** End the user's own space window early (the "×" on the card). */
  onEndSpace?: () => void;
  /** Extend the user's own space window by a fixed amount. */
  onExtendSpace?: () => void;
  /**
   * Send a gentle hug to the partner as a soft re-entry when the space window
   * elapses. Falls back to the general "Send hug" action if not provided.
   */
  onReconnectHug?: () => void;
  /**
   * Start a short check-in as a soft re-entry when the space window elapses.
   * Falls back to the general check-in action if not provided.
   */
  onReconnectCheckIn?: () => void;
  /** Whether the current user has checked in today. */
  hasMoodToday: boolean;
  onCheckIn: () => void;
  onHug: () => void;
  onDistraction: () => void;
  onLogIncident: () => void;
  /** Open the guided "Let's Chat" flow. Optional so the dashboard degrades gracefully. */
  onLetsChat?: () => void;
  onSOS: () => void;
  onOpenArtifact: () => void;
  /** Whether today's Daily Artifact has already been opened. */
  artifactOpened: boolean;
  /** Navigate to the Hearth Vault (shown after the artifact is opened). */
  onViewVault: () => void;
  /**
   * Open the Monthly Memories screen ("Rediscovery Archive" widget). Optional
   * so the dashboard degrades gracefully if a caller hasn't wired it yet.
   */
  onOpenMonthlyMemories?: () => void;
  /**
   * Whether to surface the "This Week" weekly-reflection card. The dashboard
   * shows it on Sundays (the reflection is always reachable from the Vault too).
   */
  showWeeklyReflection?: boolean;
  /** Open the Weekly Reflection retrospective. */
  onOpenWeeklyReflection?: () => void;
  /** Open the notifications inbox from the bell in the top bar. */
  onOpenNotifications?: () => void;
  /** The card number (1-10) to display for today's daily gift. null = still loading. */
  cardNumber?: number | null;
};

/** Epoch-ms of the next local midnight — when a fresh daily gift unlocks. */
function nextLocalMidnight(): number {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  ).getTime();
}

export function SanctuaryDashboard({
  userName,
  partnerName,
  relationshipDays,
  daysTillAnniversary,
  timeOfDay,
  partnerMoodLabel,
  partnerUpdatedAgo,
  userMoodLabel,
  spaceWindowOwner,
  spaceWindowEndsAt,
  canControlSpaceWindow = false,
  onEndSpace,
  onExtendSpace,
  onReconnectHug,
  onReconnectCheckIn,
  hasMoodToday,
  onCheckIn,
  onHug,
  onDistraction,
  onLogIncident,
  onLetsChat,
  onSOS,
  onOpenArtifact,
  artifactOpened,
  onViewVault,
  onOpenMonthlyMemories,
  showWeeklyReflection = false,
  onOpenWeeklyReflection,
  onOpenNotifications,
  cardNumber,
}: SanctuaryDashboardProps) {
  const partner = partnerName || 'your love';
  const you = userName || 'You';

  // Get the card image for today's gift. Use card 1 as placeholder while loading.
  const resolvedCardNumber = cardNumber ?? 1;
  const cardImage = getCardImage(resolvedCardNumber);

  // Once opened, the artifact stays sealed until the next local midnight — show
  // a live countdown so the wait for the next gift feels tangible. Recomputed
  // each render is fine; the epoch target only actually changes at midnight.
  const nextGiftAt = useMemo(() => nextLocalMidnight(), [artifactOpened]);
  const nextGift = useCountdown(nextGiftAt);
  // Shared self-regulation window: whoever started the space, both people see
  // the same live countdown on their dashboard.
  const spaceWindowMs = useMemo(() => {
    if (!spaceWindowEndsAt) return undefined;
    const parsed = Date.parse(spaceWindowEndsAt);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [spaceWindowEndsAt]);
  const spaceWindow = useCountdown(spaceWindowMs);

  // Once a space window finishes, keep the card on the dashboard for a short
  // grace period (5 minutes) so the person can choose to extend — or dismiss it
  // with the "×". `dismissed` is keyed to the current window end-time, so a new
  // or extended window automatically un-dismisses.
  const SPACE_FINISHED_GRACE_MS = 5 * 60_000;
  const [dismissedFor, setDismissedFor] = useState<number | null>(null);
  const [graceExpired, setGraceExpired] = useState(false);

  // Reset the dismissed/grace flags whenever the window's end-time changes
  // (e.g. the user extended it, or a fresh window started).
  useEffect(() => {
    setDismissedFor(null);
    setGraceExpired(false);
  }, [spaceWindowMs]);

  // When the window finishes, start the grace-period timer; after it elapses
  // the card falls away on its own.
  useEffect(() => {
    if (!spaceWindow.finished) return;
    setGraceExpired(false);
    const id = setTimeout(() => setGraceExpired(true), SPACE_FINISHED_GRACE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceWindow.finished, spaceWindowMs]);

  const dismissed = dismissedFor === spaceWindowMs;

  // Soft re-entry state for the "Ready to reconnect?" prompt shown when the
  // person's own space window elapses. Tracks whether they've sent a hug so the
  // button can confirm gently. Reset whenever a new/extended window starts.
  const [reconnectHugSent, setReconnectHugSent] = useState(false);
  useEffect(() => {
    setReconnectHugSent(false);
  }, [spaceWindowMs]);

  const handleReconnectHug = () => {
    if (reconnectHugSent) return;
    setReconnectHugSent(true);
    (onReconnectHug ?? onHug)();
  };

  const handleReconnectCheckIn = () => {
    (onReconnectCheckIn ?? onCheckIn)();
  };

  // Only the person taking the space is prompted to reconnect — the partner
  // just sees that the space wrapped up, with no pressure to reach in.
  const showReconnectPrompt = spaceWindow.finished && spaceWindowOwner === 'self';

  // The card is visible while the window is live, or for the grace period after
  // it finishes (until dismissed or the grace period lapses).
  const showSpaceCard =
    spaceWindow.active && !dismissed && (!spaceWindow.finished || !graceExpired);

  const handleDismissSpace = () => {
    setDismissedFor(spaceWindowMs ?? null);
    onEndSpace?.();
  };

  return (
    <View>
      {/* 1 ── Top bar */}
      <View style={styles.topBar}>
        <View style={styles.iconCircle}>
          <HeartIcon size={18} />
        </View>

        <View style={styles.topBarRight}>
          {/* S.O.S — subtle round emergency button; low-key so it's there when
              needed without dominating the sanctuary. */}
          <Pressable
            style={({ pressed }) => [styles.sosButton, pressed && styles.pressed]}
            onPress={onSOS}
            hitSlop={8}
            android_ripple={{ color: 'rgba(179,64,64,0.2)', borderless: true }}
            accessibilityRole="button"
            accessibilityLabel="S.O.S emergency"
          >
            <ActionImageIcon name="sos" size={20} />
          </Pressable>
          <DashboardBell onPress={onOpenNotifications} />
          <View style={styles.avatarRing}>
            <View style={styles.avatarInner} />
          </View>
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

      {/* 3b ── This Week (weekly reflection) — surfaced on Sundays */}
      {showWeeklyReflection ? (
        <Pressable
          style={({ pressed }) => [styles.weekCard, pressed && styles.pressed]}
          onPress={onOpenWeeklyReflection}
          android_ripple={{ color: 'rgba(139,111,58,0.12)' }}
          accessibilityRole="button"
          accessibilityLabel="View this week's reflection"
        >
          <View style={styles.weekCardIcon}>
            <SparkleIcon />
          </View>
          <View style={styles.weekCardText}>
            <Text style={styles.weekCardLabel}>THIS WEEK</Text>
            <Text style={styles.weekCardTitle}>Your weekly reflection is ready</Text>
          </View>
          <ArrowIcon />
        </Pressable>
      ) : null}

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
      {showSpaceCard ? (
        <View style={styles.windowCard}>
          <View style={styles.windowTextWrap}>
            <Text style={styles.windowLabel}>
              {spaceWindow.finished
                ? spaceWindowOwner === 'self'
                  ? 'YOUR SPACE HAS ENDED'
                  : `${partner.toUpperCase()}'S SPACE HAS ENDED`
                : spaceWindowOwner === 'self'
                  ? "YOU'RE TAKING SPACE"
                  : `${partner.toUpperCase()} IS TAKING SPACE`}
            </Text>
            <Text style={styles.windowSub}>
              {spaceWindow.finished
                ? spaceWindowOwner === 'self'
                  ? 'Ready to reconnect? There\u2019s no rush \u2014 reach in gently when it feels right.'
                  : 'Their quiet moment has wrapped up.'
                : spaceWindowOwner === 'self'
                  ? 'Your quiet moment. There\u2019s no rush to come back.'
                  : 'Holding a quiet moment. You are their safe harbor.'}
            </Text>

            {/*
              Once the person's OWN window elapses, gently prompt them to
              reconnect with soft re-entry options — send a hug or a short
              check-in — alongside the option to extend if they're not ready.
            */}
            {showReconnectPrompt ? (
              <View style={styles.reconnectActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.reconnectBtn,
                    styles.reconnectBtnPrimary,
                    reconnectHugSent && styles.reconnectBtnSent,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleReconnectHug}
                  disabled={reconnectHugSent}
                  android_ripple={{ color: 'rgba(139,111,58,0.15)' }}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: reconnectHugSent }}
                  accessibilityLabel={reconnectHugSent ? 'Hug sent' : 'Send a hug'}
                >
                  <Text style={styles.reconnectBtnText}>
                    {reconnectHugSent ? 'HUG SENT \u2665' : 'SEND A HUG'}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.reconnectBtn, pressed && styles.pressed]}
                  onPress={handleReconnectCheckIn}
                  android_ripple={{ color: 'rgba(139,111,58,0.15)' }}
                  accessibilityRole="button"
                  accessibilityLabel="Share a short check-in"
                >
                  <Text style={styles.reconnectBtnText}>SHORT CHECK-IN</Text>
                </Pressable>

                {canControlSpaceWindow ? (
                  <Pressable
                    style={({ pressed }) => [styles.reconnectExtendBtn, pressed && styles.pressed]}
                    onPress={onExtendSpace}
                    android_ripple={{ color: 'rgba(139,111,58,0.15)' }}
                    accessibilityRole="button"
                    accessibilityLabel="Not yet, extend your space"
                  >
                    <Text style={styles.reconnectExtendText}>NOT YET</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : spaceWindow.finished && canControlSpaceWindow ? (
              <Pressable
                style={({ pressed }) => [styles.windowExtendBtn, pressed && styles.pressed]}
                onPress={onExtendSpace}
                android_ripple={{ color: 'rgba(139,111,58,0.15)' }}
                accessibilityRole="button"
                accessibilityLabel="Extend your space"
              >
                <Text style={styles.windowExtendText}>EXTEND</Text>
              </Pressable>
            ) : null}
          </View>

          {!spaceWindow.finished ? (
            <View style={styles.windowTimePill}>
              <Text style={styles.windowTime}>{spaceWindow.label}</Text>
              <Text style={styles.windowTimeCaption}>left</Text>
            </View>
          ) : null}

          {/* The owner can end/dismiss their own window with the "×". */}
          {canControlSpaceWindow ? (
            <Pressable
              style={({ pressed }) => [styles.windowClose, pressed && styles.pressed]}
              onPress={handleDismissSpace}
              hitSlop={10}
              android_ripple={{ color: 'rgba(139,111,58,0.15)', radius: 20, borderless: true }}
              accessibilityRole="button"
              accessibilityLabel={spaceWindow.finished ? 'Dismiss' : 'End your space'}
            >
              <CloseIcon />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* 5 ── Check-in row */}
      <Pressable
        style={({ pressed }) => [styles.checkInRow, pressed && styles.pressed]}
        onPress={onCheckIn}
        android_ripple={{ color: 'rgba(139,111,58,0.12)' }}
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
          <ActionImageIcon name="calendar" size={28} />
        </View>
      </Pressable>

      {/* 6 ── Attunement grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ATTUNEMENT</Text>
        <Text style={styles.sectionAction}>Direct Touch</Text>
      </View>
      <View style={styles.attGrid}>
        <View style={styles.attRow}>
          {onLetsChat ? (
            <AttunementItem icon={<ActionImageIcon name="chat" size={150} />} title="Let's Chat" onPress={onLetsChat} />
          ) : null}
          <AttunementItem icon={<ActionImageIcon name="hug" size={150} />} title="Send hug" onPress={onHug} />
        </View>
        <View style={styles.attRow}>
          <AttunementItem icon={<ActionImageIcon name="distraction" size={150} />} title="Distraction" onPress={onDistraction} />
          <AttunementItem icon={<ActionImageIcon name="incident" size={150} />} title="Log Incident" onPress={onLogIncident} />
        </View>
      </View>

      {/* 7 ── Daily artifact */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>DAILY ARTIFACT</Text>
        <Text style={styles.sectionAction}>
          {artifactOpened
            ? nextGift.label
              ? `Next in ${nextGift.label}`
              : 'Opened'
            : '1 Available'}
        </Text>
      </View>
      <View style={styles.artifactCard}>
        <View style={styles.artifactBadge}>
          <Text style={styles.artifactBadgeText}>
            SERIES 01 · {artifactOpened ? 'OPENED' : 'UNOPENED'}
          </Text>
        </View>

        <View style={styles.artifactArtWrap}>
          <Image 
            source={cardImage} 
            style={styles.artifactArt} 
            resizeMode="cover"
          />
          {artifactOpened ? (
            <View style={styles.artifactArtDim} />
          ) : (
            <View style={styles.artifactSparkle}>
              <SparkleIcon />
            </View>
          )}
        </View>

        <Text style={styles.artifactTitle}>Mystery Booster Pack</Text>

        {artifactOpened ? (
          <>
            {nextGift.label ? (
              <Text style={styles.artifactCountdown}>
                {nextGift.label} till your next gift
              </Text>
            ) : null}
            <AnimatedButton
              onPress={onViewVault}
              style={styles.artifactBtn}
              accessibilityLabel="View vault"
            >
              <VaultIcon />
              <Text style={styles.artifactBtnText}>VIEW VAULT</Text>
            </AnimatedButton>
          </>
        ) : (
          <AnimatedButton
            onPress={onOpenArtifact}
            style={styles.artifactBtn}
            accessibilityLabel="Tear open"
          >
            <LockIcon />
            <Text style={styles.artifactBtnText}>TEAR OPEN</Text>
          </AnimatedButton>
        )}
      </View>

      {/* 8 ── Monthly Memories (Rediscovery Archive) */}
      {onOpenMonthlyMemories ? (
        <MonthlyMemoriesWidget onOpen={onOpenMonthlyMemories} />
      ) : null}
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
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.emergency,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  bellBadgeText: {
    ...typography.label,
    color: colors.neutral,
    fontSize: 10,
    letterSpacing: 0,
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
    // Subtle 3D depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  // This Week (weekly reflection) card
  weekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
    // Gold glow effect for special weekly card
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  weekCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  weekCardText: { flex: 1 },
  weekCardLabel: {
    ...typography.label,
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1,
  },
  weekCardTitle: {
    ...typography.bodyMedium,
    color: colors.neutral,
    marginTop: 2,
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
    // Subtle 3D depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
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
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(139,111,58,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,111,58,0.3)',
    padding: spacing.md,
    // Extra right padding so content never sits under the "×" close button.
    paddingRight: spacing.lg + spacing.md,
    marginBottom: spacing.md,
  },
  windowTextWrap: { flex: 1, gap: 3 },
  windowClose: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  windowExtendBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(139,111,58,0.14)',
  },
  windowExtendText: {
    ...typography.label,
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 0.8,
  },

  // "Ready to reconnect?" soft re-entry actions (shown when the person's own
  // space window elapses).
  reconnectActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  reconnectBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(139,111,58,0.14)',
    // 3D gold shadow
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  reconnectBtnPrimary: {
    backgroundColor: 'rgba(139,111,58,0.24)',
    shadowOpacity: 0.3,
    elevation: 3,
  },
  reconnectBtnSent: {
    opacity: 0.7,
  },
  reconnectBtnText: {
    ...typography.label,
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  reconnectExtendBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 12,
  },
  reconnectExtendText: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 12,
    letterSpacing: 0.8,
  },
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
    // Subtle 3D effect
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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

  // S.O.S — subtle round emergency button in the top bar. Soft translucent
  // emergency tint so it's discoverable without shouting for attention.
  sosButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(179,64,64,0.35)',
    backgroundColor: colors.emergencyBg,
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
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  attDotDanger: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emergency,
  },

  // Daily artifact
  artifactCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    // Prominent 3D effect for the special artifact
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
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
    width: 160,
    height: 224,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gold,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  artifactArt: {
    width: '100%',
    height: '100%',
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
  artifactCountdown: {
    ...typography.bodySm,
    color: colors.gold,
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: 0.3,
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
    paddingHorizontal: spacing.lg,
    minWidth: 180,
    // 3D Beveled border effect
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderTopColor: 'rgba(139, 111, 58, 1)',
    borderLeftColor: 'rgba(139, 111, 58, 0.9)',
    borderRightColor: 'rgba(107, 86, 44, 1)',
    borderBottomColor: 'rgba(107, 86, 44, 1.2)',
    // Enhanced 3D shadow
    shadowColor: '#8B6F3A',
    shadowOffset: { width: 2, height: 8 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 14,
  },
  artifactBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
