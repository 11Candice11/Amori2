/**
 * WishlistScreen — the full shared wishlist.
 *
 *   GET    /api/wishlist        → list all items
 *   POST   /api/wishlist        → create
 *   PATCH  /api/wishlist/{id}   → toggle purchased / favorite
 *   DELETE /api/wishlist/{id}   → remove an item
 *
 * A real, data-backed list: pull-to-refresh, loading + empty + error states,
 * inline add, and per-row purchased/favorite/delete actions that persist to
 * the backend. Starred items float to the top; purchased items sink to the
 * bottom with a struck-through name and a delete affordance.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { showSuccess, showError } from '../../../shared/state/bannerStore';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { togetherService } from '../services/togetherService';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import type { WishlistItemResponse } from '../types/together.types';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'Wishlist'>;

const PRIORITY_LABELS: Record<number, string> = { 1: 'Low', 2: 'Medium', 3: 'High' };

function formatPrice(price: number | null): string | null {
  if (price == null) return null;
  return price.toLocaleString(undefined, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}

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
      <Circle cx={12} cy={12} r={9} stroke="#4CAF7D" strokeWidth={1.5} />
      <Path d="M8 12l3 3 5-6" stroke="#4CAF7D" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
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

function DeleteIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={colors.neutralMuted}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function Row({
  item,
  busy,
  onTogglePurchased,
  onToggleFavorite,
  onDelete,
}: {
  item: WishlistItemResponse;
  busy: boolean;
  onTogglePurchased: (item: WishlistItemResponse) => void;
  onToggleFavorite: (item: WishlistItemResponse) => void;
  onDelete: (item: WishlistItemResponse) => void;
}) {
  const priority = PRIORITY_LABELS[item.priority];
  const price = formatPrice(item.price);
  // Only the owner can delete (backend-enforced), so hide the x for the
  // partner's items and keep showing the star instead.
  const canDelete = item.isPurchased && userSettingsStore.get()?.id === item.addedByUserId;
  return (
    <View style={[styles.row, item.isPurchased && styles.rowCompleted]}>
      <View style={styles.rowHeader}>
        <Pressable
          onPress={() => onTogglePurchased(item)}
          hitSlop={8}
          disabled={busy}
          style={styles.rowIcon}
          accessibilityRole="button"
          accessibilityLabel={item.isPurchased ? 'Mark not purchased' : 'Mark purchased'}
        >
          {item.isPurchased ? <CheckCircleIcon /> : <CircleIcon />}
        </Pressable>

        <Text style={[styles.rowTitle, item.isPurchased && styles.rowTitleDone]}>
          {item.name}
        </Text>

        {canDelete ? (
          <Pressable
            onPress={() => onDelete(item)}
            hitSlop={8}
            disabled={busy}
            style={styles.rowIcon}
            accessibilityRole="button"
            accessibilityLabel="Delete wishlist item"
          >
            <DeleteIcon />
          </Pressable>
        ) : (
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
        )}
      </View>
      {item.description ? (
        <Text style={styles.rowDesc} numberOfLines={2}>
          {item.description}
        </Text>
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
    </View>
  );
}

export function WishlistScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<WishlistItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleSave = useCallback(async () => {
    const trimmed = newItemName.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setError(null);
    try {
      await togetherService.createWishlistItem({ name: trimmed });
      showSuccess('Created!');
      setNewItemName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the item.');
      showError('Sorry that failed :(');
    } finally {
      setSaving(false);
    }
  }, [newItemName, saving, load]);

  const handleTogglePurchased = useCallback(
    async (item: WishlistItemResponse) => {
      if (busyId) return;
      setBusyId(item.id);
      setError(null);
      try {
        await togetherService.setWishlistItemPurchased(item.id, !item.isPurchased);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update the item.');
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

  const handleDelete = useCallback(
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

  /**
   * Starred (favorite) items float to the top; purchased items sink to the
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
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
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
                onTogglePurchased={handleTogglePurchased}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No wishes shared yet. Add your first below.</Text>
              </View>
            }
            ListFooterComponent={
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Add to Wishlist..."
                  placeholderTextColor={colors.neutralSubtle}
                  value={newItemName}
                  onChangeText={setNewItemName}
                  onSubmitEditing={handleSave}
                  returnKeyType="done"
                  editable={!saving}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.saveBtn,
                    (!newItemName.trim() || saving || pressed) && styles.saveBtnDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!newItemName.trim() || saving}
                  accessibilityRole="button"
                  accessibilityLabel="Save wishlist item"
                >
                  {saving ? (
                    <ActivityIndicator color={colors.ctaText} size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </Pressable>
              </View>
            }
          />
          {error && items.length > 0 ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}
        </KeyboardAvoidingView>
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
  rowDesc: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 13,
    marginTop: 4,
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
  inputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    ...typography.body,
    color: colors.neutral,
    fontSize: 15,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    flex: 1,
  },
  saveBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
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
