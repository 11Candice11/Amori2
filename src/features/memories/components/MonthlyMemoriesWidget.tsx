/**
 * MonthlyMemoriesWidget — compact "Rediscovery Archive" card for the Sanctuary
 * dashboard. Surfaces this calendar month's memories across the current and
 * past years (like iOS Photos "Memories").
 *
 * It renders:
 *   - a fanned stack of up to 3 preview thumbnails (favorited memories first,
 *     then most recent),
 *   - a count + one-line summary,
 *   - and navigates to MonthlyMemoriesScreen (current month pre-selected) on tap.
 *
 * Data comes from the shared `useMonthlyMemories` hook so the widget and the
 * full screen agree on grouping. All colors/fonts come from theme tokens.
 *
 * Empty state (product decision): when the month has zero memories in any year,
 * the widget stays visible with a gentle "Add your first memory this month"
 * prompt rather than disappearing (avoids a dashboard layout jump and matches
 * the app's no-pressure tone). Pass `hideWhenEmpty` to opt into hiding instead.
 */
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { useMonthlyMemories, previewPhotoUrls } from '../hooks/useMonthlyMemories';

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArchiveIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7.5A1.5 1.5 0 015.5 6h13A1.5 1.5 0 0120 7.5v10A1.5 1.5 0 0118.5 19h-13A1.5 1.5 0 014 17.5v-10z"
        stroke={colors.gold}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path d="M4 9.5h16M10 12.5h4" stroke={colors.gold} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function ArrowIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14M13 6l6 6-6 6"
        stroke={colors.gold}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PhotoGlyph() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6.5A1.5 1.5 0 015.5 5h13A1.5 1.5 0 0120 6.5v11A1.5 1.5 0 0118.5 19h-13A1.5 1.5 0 014 17.5v-11z"
        stroke={colors.neutralSubtle}
        strokeWidth={1.5}
      />
      <Path
        d="M4 16l4-4 3 3 4-5 5 6"
        stroke={colors.neutralSubtle}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Fanned thumbnail stack ─────────────────────────────────────────────────────

/** A fanned deck of up to 3 preview photos. Falls back to a placeholder tile. */
function ThumbnailFan({ uris }: { uris: string[] }) {
  // Rotations/offsets for the fan effect (bottom → top of the stack).
  const layout = [
    { rotate: '-7deg', translateX: -10, z: 1 },
    { rotate: '5deg', translateX: 8, z: 2 },
    { rotate: '-1deg', translateX: 0, z: 3 },
  ];

  if (uris.length === 0) {
    return (
      <View style={[styles.thumb, styles.thumbPlaceholder]}>
        <PhotoGlyph />
      </View>
    );
  }

  // Render up to 3; the last in the array sits on top (highest z).
  const shown = uris.slice(0, 3);
  return (
    <View style={styles.fanWrap}>
      {shown.map((uri, i) => {
        const l = layout[i] ?? layout[layout.length - 1];
        return (
          <Image
            key={`${uri}-${i}`}
            source={{ uri }}
            resizeMode="cover"
            style={[
              styles.thumb,
              {
                transform: [{ rotate: l.rotate }, { translateX: l.translateX }],
                zIndex: l.z,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

// ─── Widget ─────────────────────────────────────────────────────────────────────

export interface MonthlyMemoriesWidgetProps {
  /** Navigate to the full screen with the current month pre-selected. */
  onOpen: () => void;
  /**
   * When true and there are no memories this month in any year, render nothing
   * instead of the gentle prompt. Defaults to false (prompt is shown).
   */
  hideWhenEmpty?: boolean;
}

export function MonthlyMemoriesWidget({
  onOpen,
  hideWhenEmpty = false,
}: MonthlyMemoriesWidgetProps) {
  // The widget always shows the *current* calendar month.
  const { monthName, grouping, loading } = useMonthlyMemories();

  const previews = useMemo(
    () => previewPhotoUrls(grouping.all, 3),
    [grouping.all],
  );

  const { addedThisMonthCount, pastYearsCount, onThisMonthInPastYears, isEmpty } =
    grouping;

  // One-line summary. Prefer the "on this day" hook when there's history,
  // otherwise summarise what was added this month.
  const summary = useMemo(() => {
    if (isEmpty) return 'No moments captured yet this month';
    const parts: string[] = [];
    if (addedThisMonthCount > 0) {
      parts.push(
        `${addedThisMonthCount} ${addedThisMonthCount === 1 ? 'moment' : 'moments'} this month`,
      );
    }
    if (pastYearsCount > 0) {
      const years = onThisMonthInPastYears.length;
      parts.push(
        `${pastYearsCount} from ${years} ${years === 1 ? 'year' : 'years'} ago`,
      );
    }
    return parts.join(' · ');
  }, [isEmpty, addedThisMonthCount, pastYearsCount, onThisMonthInPastYears]);

  const totalCount = addedThisMonthCount + pastYearsCount;

  // Hide entirely (opt-in) once loaded and empty.
  if (hideWhenEmpty && !loading && isEmpty) return null;

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>REDISCOVERY ARCHIVE</Text>
        <Text style={styles.sectionAction}>{monthName}</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={onOpen}
        android_ripple={{ color: 'rgba(139,111,58,0.12)' }}
        accessibilityRole="button"
        accessibilityLabel={
          isEmpty
            ? `${monthName} memories. None yet. Tap to add your first memory this month.`
            : `${monthName} memories. ${summary}. Tap to explore.`
        }
      >
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <ArchiveIcon size={16} />
            <Text style={styles.badgeText}>{monthName.toUpperCase()}</Text>
          </View>
          <ArrowIcon />
        </View>

        <View style={styles.body}>
          <ThumbnailFan uris={previews} />

          <View style={styles.copy}>
            {isEmpty ? (
              <>
                <Text style={styles.title}>Add your first memory this month</Text>
                <Text style={styles.summary}>
                  Capture a moment from {monthName} — it'll live here for years to come.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.count}>
                  {totalCount} {totalCount === 1 ? 'memory' : 'memories'}
                </Text>
                <Text style={styles.summary} numberOfLines={2}>
                  {summary}
                </Text>
              </>
            )}
          </View>
        </View>
      </Pressable>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const THUMB = 64;

const styles = StyleSheet.create({
  // Section header — matches the dashboard's other section headers.
  sectionHeader: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.neutralMuted,
    letterSpacing: 1,
  },
  sectionAction: {
    ...typography.bodySm,
    color: colors.gold,
  },

  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(139,111,58,0.12)',
  },
  badgeText: {
    ...typography.label,
    color: colors.gold,
    letterSpacing: 1,
  },

  body: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.md,
  },

  // Fanned thumbnails
  fanWrap: {
    width: THUMB + 28,
    height: THUMB + 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surfaceCard,
    backgroundColor: colors.surface,
  },
  thumbPlaceholder: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
  },

  copy: {
    flex: 1,
  },
  title: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
    marginBottom: 4,
  },
  count: {
    ...typography.headlineSm,
    color: colors.neutral,
    marginBottom: 2,
  },
  summary: {
    ...typography.bodySm,
    color: colors.neutralMuted,
  },
});
