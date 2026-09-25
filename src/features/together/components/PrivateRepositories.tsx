/**
 * PrivateRepositories — the couple's shared, backend-backed collections
 * surfaced as repository cards.
 *
 * Two real repositories are shown:
 *   - Shared Wishlist (GET /api/wishlist): item count, favorite count, and the
 *     most recently updated preview all come from the response.
 *   - Date Ideas (GET /api/dates): item count, favorite count, and a preview
 *     of the most recent titles.
 *
 * Everything is real; there is no fabricated content.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { ActionImageIcon } from '../../../shared/components/icons/AppIcons';
import type {
  DateIdeaResponse,
  WishlistItemResponse,
} from '../types/together.types';

// ─── Icons ──────────────────────────────────────────────────────────────────

function HeartIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20s-7-4.5-9.2-9A4.6 4.6 0 0112 6.5 4.6 4.6 0 0121.2 11C19 15.5 12 20 12 20z"
        stroke={colors.gold}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
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
function lastTouched(items: { updatedAt?: string | null; createdAt: string }[]): string | null {
  let latest: number | null = null;
  for (const it of items) {
    const stamp = it.updatedAt ?? it.createdAt;
    const t = new Date(stamp).getTime();
    if (!Number.isNaN(t) && (latest == null || t > latest)) latest = t;
  }
  return latest != null ? new Date(latest).toISOString() : null;
}

// ─── Repository card ────────────────────────────────────────────────────────

type RepositoryCardProps = {
  title: string;
  icon: React.ReactNode;
  count: number;
  favorites: number;
  preview: string;
  touched: string | null;
  onPress?: () => void;
  accessibilityLabel: string;
  /**
   * When true, the icon is a self-framed illustrated PNG and is rendered on its
   * own (the small tinted circle would double-frame it). Line-glyph SVGs get
   * the circle.
   */
  framedIcon?: boolean;
};

function RepositoryCard({
  title,
  icon,
  count,
  favorites,
  preview,
  touched,
  onPress,
  accessibilityLabel,
  framedIcon = false,
}: RepositoryCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(197,163,101,0.1)' }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.cardHeader}>
        {framedIcon ? icon : <View style={styles.iconCircle}>{icon}</View>}
        <View style={styles.headerTextWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
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
          <Text style={styles.metaValue}>{count} items</Text>
          <Text style={styles.metaLabel}>recorded</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaValue}>{touched ? 'Last touched' : 'Not yet'}</Text>
          <Text style={styles.metaLabel}>{touched ?? 'touched'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type PrivateRepositoriesProps = {
  wishlist: WishlistItemResponse[];
  dateIdeas: DateIdeaResponse[];
  onOpenWishlist?: () => void;
  onOpenDateIdeas?: () => void;
};

export function PrivateRepositories({
  wishlist,
  dateIdeas,
  onOpenWishlist,
  onOpenDateIdeas,
}: PrivateRepositoriesProps) {
  // ── Shared Wishlist ─────────────────────────────────────────────────────
  const wishFavorites = useMemo(
    () => wishlist.filter((w) => w.isFavorite).length,
    [wishlist],
  );
  const wishTouched = useMemo(() => relativeDay(lastTouched(wishlist)), [wishlist]);
  const wishPreview = useMemo(() => {
    const names = wishlist.slice(0, 3).map((w) => w.name);
    if (names.length === 0) return 'Nothing saved yet — add a wish to get started.';
    return names.join(', ') + (wishlist.length > 3 ? '…' : '.');
  }, [wishlist]);

  // ── Date Ideas ───────────────────────────────────────────────────────────
  const dateFavorites = useMemo(
    () => dateIdeas.filter((d) => d.isFavorite).length,
    [dateIdeas],
  );
  const dateTouched = useMemo(() => relativeDay(lastTouched(dateIdeas)), [dateIdeas]);
  const datePreview = useMemo(() => {
    const titles = dateIdeas.slice(0, 3).map((d) => d.title);
    if (titles.length === 0) return 'No date ideas yet — add one to get started.';
    return titles.join(', ') + (dateIdeas.length > 3 ? '…' : '.');
  }, [dateIdeas]);

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Private Repositories</Text>
      </View>

      <RepositoryCard
        title="Shared Wishlist"
        icon={<ActionImageIcon name="wishlist" size={40} />}
        framedIcon
        count={wishlist.length}
        favorites={wishFavorites}
        preview={wishPreview}
        touched={wishTouched}
        onPress={onOpenWishlist}
        accessibilityLabel="Open shared wishlist"
      />

      <RepositoryCard
        title="Date Ideas"
        icon={<HeartIcon />}
        count={dateIdeas.length}
        favorites={dateFavorites}
        preview={datePreview}
        touched={dateTouched}
        onPress={onOpenDateIdeas}
        accessibilityLabel="Open date ideas"
      />
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
