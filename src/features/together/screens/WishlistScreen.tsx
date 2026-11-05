/**
 * WishlistScreen — the full shared wishlist.
 *
 *   GET    /api/wishlist        → list all items
 *   PATCH  /api/wishlist/{id}   → mark fulfilled / reopen, favorite
 *   DELETE /api/wishlist/{id}   → remove an item
 *
 * Adding or editing a wish opens AddWishlistItemScreen (photo, title,
 * description, link).
 *
 * A real, data-backed list: pull-to-refresh, loading + empty + error states,
 * and per-row fulfilled/favorite actions that persist to the backend. Each row
 * shows the wish's photo, description and a tappable link when it has them.
 *
 * Either partner can close a wish as Fulfilled (and Reopen it). That keeps the
 * wish: it gets a "Fulfilled" badge with the date, a struck-through title, and
 * sinks to the bottom. Deleting is separate and permanent. Your own wishes also
 * get Edit and Delete (delete asks for confirmation); the backend only lets the
 * owner change or remove a wish. Starred items float to the top. The list
 * reloads whenever the screen regains focus, so a wish added or edited on the
 * compose screen shows up at once.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { showSuccess, showError } from '../../../shared/state/bannerStore';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { togetherService } from '../services/togetherService';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import type { WishlistItemResponse } from '../types/together.types';
import { formatCost } from '../utils/cost';
import { formatShortDate } from '../utils/formatDate';
import { linkHost, normalizeLink } from '../utils/links';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'Wishlist'>;

const PRIORITY_LABELS: Record<number, string> = { 1: 'Low', 2: 'Medium', 3: 'High' };

/** The "done" green, shared by the tick, the Fulfilled badge and its button. */
const FULFILLED_GREEN = '#4CAF7D';

// ─── Icons ──────────────────────────────────────────────────────────────────

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1z"
        fill={filled ? colors.gold : 'none'}
        stroke={colors.gold}
        strokeWidth={filled ? 0 : 1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckCircleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={FULFILLED_GREEN} strokeWidth={1.5} />
      <Path d="M8 12l3 3 5-6" stroke={FULFILLED_GREEN} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CircleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={colors.neutralMuted} strokeWidth={1.6} />
    </Svg>
  );
}

function LinkIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"
        stroke={colors.gold}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function Row({
  item,
  busy,
  onToggleFulfilled,
  onToggleFavorite,
  onEdit,
  onDelete,
  onOpenLink,
}: {
  item: WishlistItemResponse;
  busy: boolean;
  onToggleFulfilled: (item: WishlistItemResponse) => void;
  onToggleFavorite: (item: WishlistItemResponse) => void;
  onEdit: (item: WishlistItemResponse) => void;
  onDelete: (item: WishlistItemResponse) => void;
  onOpenLink: (url: string) => void;
}) {
  const priority = PRIORITY_LABELS[item.priority];
  const price = formatCost(item.price);
  const imageUri = item.imageUrl ? resolveMediaUrl(item.imageUrl) : null;
  // Only ever offer a link that is a valid http(s) address.
  const link = normalizeLink(item.url);
  const host = link ? linkHost(link) : null;
  // Only the owner can edit or delete a wish (backend-enforced), so only offer
  // those actions on your own items. Either partner can still star / tick off.
  const isOwner = userSettingsStore.get()?.id === item.addedByUserId;
  const fulfilledOn = item.isPurchased ? formatShortDate(item.purchasedAt) : null;
  return (
    <View style={[styles.row, item.isPurchased && styles.rowCompleted]}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.rowImage}
          resizeMode="cover"
          accessibilityLabel={`Photo of ${item.name}`}
        />
      ) : null}
      <View style={styles.rowHeader}>
        <Pressable
          onPress={() => onToggleFulfilled(item)}
          hitSlop={8}
          disabled={busy}
          style={styles.rowIcon}
          accessibilityRole="button"
          accessibilityLabel={item.isPurchased ? 'Reopen wish' : 'Mark fulfilled'}
        >
          {item.isPurchased ? <CheckCircleIcon /> : <CircleIcon />}
        </Pressable>

        <Text style={[styles.rowTitle, item.isPurchased && styles.rowTitleDone]}>
          {item.name}
        </Text>

        <Pressable
          onPress={() => onToggleFavorite(item)}
          hitSlop={8}
          disabled={busy}
          style={styles.rowIcon}
          accessibilityRole="button"
          accessibilityLabel={item.isFavorite ? 'Remove favorite' : 'Add favorite'}
        >
          <StarIcon filled={item.isFavorite} />
        </Pressable>
      </View>
      {item.isPurchased ? (
        <View style={styles.fulfilledBadge} accessible accessibilityLabel="Fulfilled">
          <Text style={styles.fulfilledBadgeText}>
            {fulfilledOn ? `✓ Fulfilled · ${fulfilledOn}` : '✓ Fulfilled'}
          </Text>
        </View>
      ) : null}
      {item.description ? (
        <Text style={styles.rowDesc} numberOfLines={3}>
          {item.description}
        </Text>
      ) : null}
      {link && host ? (
        <Pressable
          onPress={() => onOpenLink(link)}
          hitSlop={8}
          style={styles.linkChip}
          accessibilityRole="link"
          accessibilityLabel={`Open link to ${host}`}
        >
          <LinkIcon />
          <Text style={styles.linkText} numberOfLines={1}>
            {host}
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.rowMeta}>
        <Text style={styles.rowMetaText}>Added by {item.addedByName}</Text>
        {priority ? (
          <>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.rowMetaText}>{priority} priority</Text>
          </>
        ) : null}
        {price ? (
          <>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.rowMetaAccent}>{price}</Text>
          </>
        ) : null}
      </View>
      <View style={styles.rowActions}>
        {/* Close the wish (kept in the list) or bring it back. Either partner. */}
        <Pressable
          onPress={() => onToggleFulfilled(item)}
          hitSlop={8}
          disabled={busy}
          style={item.isPurchased ? undefined : styles.fulfilBtn}
          accessibilityRole="button"
          accessibilityLabel={item.isPurchased ? `Reopen ${item.name}` : `Mark ${item.name} as fulfilled`}
        >
          <Text style={item.isPurchased ? styles.reopenText : styles.fulfilBtnText}>
            {item.isPurchased ? 'Reopen' : '✓ Mark fulfilled'}
          </Text>
        </Pressable>

        {isOwner ? (
          <View style={styles.ownerActions}>
            <Pressable
              onPress={() => onEdit(item)}
              hitSlop={8}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.name}`}
            >
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={() => onDelete(item)}
              hitSlop={8}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.name}`}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function WishlistScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<WishlistItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Id of a row with an action in flight, to disable its buttons. */
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await togetherService.getWishlist();
      setItems(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the wishlist.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load on first open and again whenever we return (e.g. after adding a wish).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleAdd = useCallback(() => {
    navigation.navigate('AddWishlistItem');
  }, [navigation]);

  const handleOpenLink = useCallback((url: string) => {
    Linking.openURL(url).catch(() => showError("Couldn't open that link"));
  }, []);

  /** Close a wish as fulfilled, or reopen it. The wish is kept either way. */
  const handleToggleFulfilled = useCallback(
    async (item: WishlistItemResponse) => {
      if (busyId) return;
      setBusyId(item.id);
      setError(null);
      const fulfilling = !item.isPurchased;
      try {
        await togetherService.setWishlistItemFulfilled(item.id, fulfilling);
        if (fulfilling) {
          showSuccessOverlay('Wish fulfilled ❤');
        } else {
          showSuccess('Wish reopened');
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update the item.');
        showError('Sorry that failed :(');
      } finally {
        setBusyId(null);
      }
    },
    [busyId, load],
  );

  const handleToggleFavorite = useCallback(
    async (item: WishlistItemResponse) => {
      if (busyId) return;
      setBusyId(item.id);
      setError(null);
      try {
        await togetherService.setWishlistItemFavorite(item.id, !item.isFavorite);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update the item.');
      } finally {
        setBusyId(null);
      }
    },
    [busyId, load],
  );

  const handleEdit = useCallback(
    (item: WishlistItemResponse) => {
      navigation.navigate('AddWishlistItem', { item });
    },
    [navigation],
  );

  const deleteItem = useCallback(
    async (item: WishlistItemResponse) => {
      if (busyId) return;
      setBusyId(item.id);
      setError(null);
      try {
        await togetherService.deleteWishlistItem(item.id);
        showSuccess('Deleted!');
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete the item.');
        showError('Sorry that failed :(');
      } finally {
        setBusyId(null);
      }
    },
    [busyId, load],
  );

  /** Deleting can't be undone, so ask first. */
  const handleDelete = useCallback(
    (item: WishlistItemResponse) => {
      Alert.alert('Delete wish', `Delete "${item.name}" from your wishlist?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteItem(item) },
      ]);
    },
    [deleteItem],
  );

  /**
   * Starred (favorite) items float to the top; fulfilled items sink to the
   * bottom. Within each group the original server order is preserved.
   */
  const sortedItems = useMemo(() => {
    const rank = (i: WishlistItemResponse) =>
      i.isPurchased ? 2 : i.isFavorite ? 0 : 1;
    return items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index)
      .map(({ item }) => item);
  }, [items]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Shared Wishlist" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.flex}>
          <FlatList
            data={sortedItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
            }
            renderItem={({ item }) => (
              <Row
                item={item}
                busy={busyId === item.id}
                onToggleFulfilled={handleToggleFulfilled}
                onToggleFavorite={handleToggleFavorite}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onOpenLink={handleOpenLink}
              />
            )}
            ListHeaderComponent={
              <Pressable
                style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
                onPress={handleAdd}
                accessibilityRole="button"
                accessibilityLabel="Add to wishlist"
              >
                <Text style={styles.addBtnText}>+ Add to Wishlist</Text>
              </Pressable>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No wishes shared yet. Add your first above.</Text>
              </View>
            }
          />
          {error && items.length > 0 ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rowCompleted: {
    opacity: 0.6,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowIcon: {
    marginTop: 0,
  },
  rowTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
    flex: 1,
  },
  rowTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.neutralMuted,
  },
  rowImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  rowDesc: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 13,
    marginTop: 4,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(139,111,58,0.12)',
    maxWidth: '100%',
  },
  linkText: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 12,
    flexShrink: 1,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.sm,
  },
  rowMetaText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },
  rowMetaAccent: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 12,
  },
  metaDot: {
    color: colors.neutralSubtle,
    fontSize: 10,
  },
  fulfilledBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FULFILLED_GREEN,
    backgroundColor: 'rgba(76,175,125,0.12)',
  },
  fulfilledBadgeText: {
    ...typography.bodySm,
    color: FULFILLED_GREEN,
    fontSize: 12,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  ownerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  fulfilBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FULFILLED_GREEN,
  },
  fulfilBtnText: {
    ...typography.bodySemiBold,
    color: FULFILLED_GREEN,
    fontSize: 13,
  },
  reopenText: {
    ...typography.bodySemiBold,
    color: colors.neutralMuted,
    fontSize: 13,
  },
  editText: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 13,
  },
  deleteText: {
    ...typography.bodySemiBold,
    color: colors.emergency,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
  },
  addBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    // 3D beveled border
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderTopColor: 'rgba(139,111,58,1)',
    borderLeftColor: 'rgba(139,111,58,0.9)',
    borderRightColor: 'rgba(107,86,44,1)',
    borderBottomColor: 'rgba(107,86,44,1.2)',
    shadowColor: 'rgba(139,111,58,0.8)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  addBtnPressed: {
    opacity: 0.7,
  },
  addBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 15,
  },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(239,68,68,0.2)',
    padding: spacing.md,
  },
  errorBannerText: {
    ...typography.bodySm,
    color: colors.emergency,
    textAlign: 'center',
    fontSize: 13,
  },
});
