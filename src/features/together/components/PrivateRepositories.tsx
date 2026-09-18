/**
 * PrivateRepositories — the couple's shared, backend-backed collections
 * surfaced as "vaulted" repository cards.
 *
 * Only real repositories are shown. Today that's the Shared Wishlist
 * (GET /api/wishlist): item count, favorite count, and the most recently
 * updated preview all come from the response. There is no fabricated
 * "cipher/journal" surface because the backend has no such feature.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import type { WishlistItemResponse } from '../types/together.types';

// ─── Icons ──────────────────────────────────────────────────────────────────

function GiftIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={9} width={17} height={11.5} rx={2} stroke={colors.gold} strokeWidth={1.5} />
      <Path d="M3.5 12.5h17M12 9v11.5" stroke={colors.gold} strokeWidth={1.5} strokeLinecap="round" />
      <Path
        d="M12 9S10.5 5 8.3 5a2 2 0 000 4H12zm0 0s1.5-4 3.7-4a2 2 0 010 4H12z"
        stroke={colors.gold}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LockBadgeIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={10} width={14} height={10} rx={2.5} stroke={colors.neutralMuted} strokeWidth={1.8} />
      <Path d="M8 10V7.5a4 4 0 018 0V10" stroke={colors.neutralMuted} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compact relative time, e.g. "today", "yesterday", "3 days ago". */
function relativeDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** Most recent updatedAt/createdAt across items. */
function lastTouched(items: WishlistItemResponse[]): string | null {
  let latest: number | null = null;
  for (const it of items) {
    const stamp = it.updatedAt ?? it.createdAt;
    const t = new Date(stamp).getTime();
    if (!Number.isNaN(t) && (latest == null || t > latest)) latest = t;
  }
  return latest != null ? new Date(latest).toISOString() : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

type PrivateRepositoriesProps = {
  wishlist: WishlistItemResponse[];
  onOpenWishlist?: () => void;
};

export function PrivateRepositories({
  wishlist,
  onOpenWishlist,
}: PrivateRepositoriesProps) {
  const favorites = useMemo(
    () => wishlist.filter((w) => w.isFavorite).length,
    [wishlist],
  );
  const touched = useMemo(() => relativeDay(lastTouched(wishlist)), [wishlist]);

  // Preview: names of the first couple of items, if any.
  const preview = useMemo(() => {
    const names = wishlist.slice(0, 3).map((w) => w.name);
    if (names.length === 0) return 'Nothing saved yet — add a wish to get started.';
    return names.join(', ') + (wishlist.length > 3 ? '…' : '.');
  }, [wishlist]);

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Private Repositories</Text>
        <View style={styles.vaultedTag}>
          <LockBadgeIcon />
          <Text style={styles.vaultedText}>VAULTED</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={onOpenWishlist}
        android_ripple={{ color: 'rgba(197,163,101,0.1)' }}
        accessibilityRole="button"
        accessibilityLabel="Open shared wishlist"
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <GiftIcon />
          </View>
          <View style={styles.headerTextWrap}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Shared Wishlist</Text>
              {favorites > 0 ? (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>{favorites} ★</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.preview} numberOfLines={2}>
              {preview}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaValue}>{wishlist.length} items</Text>
            <Text style={styles.metaLabel}>recorded</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaValue}>
              {touched ? 'Last touched' : 'Not yet'}
            </Text>
            <Text style={styles.metaLabel}>{touched ?? 'touched'}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.gold,
    fontSize: 18,
  },
  vaultedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  vaultedText: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 9,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.25)',
    backgroundColor: 'rgba(197,163,101,0.08)',
  },
  headerTextWrap: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
    flexShrink: 1,
    paddingRight: spacing.sm,
  },
  newBadge: {
    backgroundColor: 'rgba(197,163,101,0.14)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.3)',
  },
  newBadgeText: {
    ...typography.label,
    color: colors.gold,
    fontSize: 9,
  },
  preview: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  metaCol: {
    flex: 1,
    gap: 1,
  },
  metaValue: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 13,
  },
  metaLabel: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    fontSize: 11,
  },
});
