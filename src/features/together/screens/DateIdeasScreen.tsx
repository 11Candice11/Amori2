/**
 * DateIdeasScreen — the couple's shared date ideas.
 *
 * Backed by the dedicated Date Planner API (/api/dates), which stores a richer
 * DateIdea than the bucket list (category, estimated cost, duration):
 *   GET    /api/dates                → list all ideas
 *   PATCH  /api/dates/{id}           → mark done / reopen, favorite
 *   DELETE /api/dates/{id}           → remove an idea
 *
 * Adding or editing an idea opens AddDateIdeaScreen (photo, title, description,
 * link).
 *
 * Real, data-backed: pull-to-refresh, loading + empty + error states, and
 * per-row done/favorite actions that persist to the backend. Each row shows the
 * idea's photo, description and a tappable link when it has them.
 *
 * Either partner can mark an idea Done (and Reopen it). That keeps the idea: it
 * gets a "Done" badge with the date, a struck-through title, and sinks to the
 * bottom. Deleting is separate and permanent. Either partner can Edit an idea;
 * only the person who added it sees Delete (the backend enforces this, and
 * delete asks for confirmation). Starred ideas float to the top. The list
 * reloads whenever the screen regains focus, so an idea added or edited on the
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
import { SupportPreferencesLink } from '../../supportProfile/components/SupportPreferencesLink';
import { showSuccess, showError } from '../../../shared/state/bannerStore';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { togetherService } from '../services/togetherService';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import {
  DATE_CATEGORY_DISPLAY,
  DATE_CATEGORY_LABELS,
  type DateIdeaResponse,
} from '../types/together.types';
import { formatCost } from '../utils/cost';
import { formatShortDate } from '../utils/formatDate';
import { linkHost, normalizeLink } from '../utils/links';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'DateIdeas'>;

/** The "done" green, shared by the tick, the Done badge and its button. */
const DONE_GREEN = '#4CAF7D';

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
      <Circle cx={12} cy={12} r={9} stroke={DONE_GREEN} strokeWidth={1.5} />
      <Path d="M8 12l3 3 5-6" stroke={DONE_GREEN} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
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

// ─── Formatting ───────────────────────────────────────────────────────────────

function categoryLabel(category: number): string | null {
  const key = DATE_CATEGORY_LABELS[category];
  return key ? DATE_CATEGORY_DISPLAY[key] : null;
}

function formatDuration(minutes: number | null): string | null {
  if (minutes == null || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

// ─── Row ────────────────────────────────────────────────────────────────────

function Row({
  item,
  busy,
  onToggleComplete,
  onToggleFavorite,
  onEdit,
  onDelete,
  onOpenLink,
}: {
  item: DateIdeaResponse;
  busy: boolean;
  onToggleComplete: (item: DateIdeaResponse) => void;
  onToggleFavorite: (item: DateIdeaResponse) => void;
  onEdit: (item: DateIdeaResponse) => void;
  onDelete: (item: DateIdeaResponse) => void;
  onOpenLink: (url: string) => void;
}) {
  const category = categoryLabel(item.category);
  const cost = formatCost(item.estimatedCost);
  const duration = formatDuration(item.durationMinutes);
  const imageUri = item.imageUrl ? resolveMediaUrl(item.imageUrl) : null;
  // Only ever offer a link that is a valid http(s) address.
  const link = normalizeLink(item.url);
  const host = link ? linkHost(link) : null;
  // Either partner can edit or mark done, but only the creator can delete
  // (backend-enforced), so only show Delete on your own ideas.
  const canDelete = userSettingsStore.get()?.id === item.createdByUserId;
  const doneOn = item.isCompleted ? formatShortDate(item.completedAt) : null;
  return (
    <View style={[styles.row, item.isCompleted && styles.rowCompleted]}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.rowImage}
          resizeMode="cover"
          accessibilityLabel={`Photo of ${item.title}`}
        />
      ) : null}
      <View style={styles.rowHeader}>
        <Pressable
          onPress={() => onToggleComplete(item)}
          hitSlop={8}
          disabled={busy}
          style={styles.rowIcon}
          accessibilityRole="button"
          accessibilityLabel={item.isCompleted ? 'Reopen date idea' : 'Mark done'}
        >
          {item.isCompleted ? <CheckCircleIcon /> : <CircleIcon />}
        </Pressable>

        <View style={styles.rowTextWrap}>
          <Text style={[styles.rowTitle, item.isCompleted && styles.rowTitleDone]}>
            {item.title}
          </Text>
          <View style={styles.rowMeta}>
            <Text style={styles.rowMetaText}>Added by {item.createdByName}</Text>
            {category ? (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.rowMetaText}>{category}</Text>
              </>
            ) : null}
            {cost ? (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.rowMetaAccent}>{cost}</Text>
              </>
            ) : null}
            {duration ? (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.rowMetaText}>{duration}</Text>
              </>
            ) : null}
          </View>
        </View>

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

      {item.isCompleted ? (
        <View style={styles.doneBadge} accessible accessibilityLabel="Done">
          <Text style={styles.doneBadgeText}>{doneOn ? `✓ Done · ${doneOn}` : '✓ Done'}</Text>
        </View>
      ) : null}

      {item.description ? (
        <Text style={styles.rowDesc} numberOfLines={3}>
          {item.description}
        </Text>
      ) : null}

      {item.location ? <Text style={styles.rowSub}>{item.location}</Text> : null}

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

      <View style={styles.rowActions}>
        {/* Tick the date off (kept in the list) or bring it back. Either partner. */}
        <Pressable
          onPress={() => onToggleComplete(item)}
          hitSlop={8}
          disabled={busy}
          style={item.isCompleted ? undefined : styles.doneBtn}
          accessibilityRole="button"
          accessibilityLabel={item.isCompleted ? `Reopen ${item.title}` : `Mark ${item.title} as done`}
        >
          <Text style={item.isCompleted ? styles.reopenText : styles.doneBtnText}>
            {item.isCompleted ? 'Reopen' : '✓ Mark done'}
          </Text>
        </Pressable>

        <View style={styles.ownerActions}>
          <Pressable
            onPress={() => onEdit(item)}
            hitSlop={8}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.title}`}
          >
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
          {canDelete ? (
            <Pressable
              onPress={() => onDelete(item)}
              hitSlop={8}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title}`}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function DateIdeasScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<DateIdeaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Id of a row with an action in flight, to disable its buttons. */
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await togetherService.getDateIdeas();
      setItems(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load date ideas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load on first open and again whenever we return (e.g. after adding an idea).
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
    navigation.navigate('AddDateIdea');
  }, [navigation]);

  const handleEdit = useCallback(
    (item: DateIdeaResponse) => {
      navigation.navigate('AddDateIdea', { idea: item });
    },
    [navigation],
  );

  const handleOpenLink = useCallback((url: string) => {
    Linking.openURL(url).catch(() => showError("Couldn't open that link"));
  }, []);

  /** Tick a date idea off as done, or reopen it. The idea is kept either way. */
  const handleToggleComplete = useCallback(
    async (item: DateIdeaResponse) => {
      if (busyId) return;
      setBusyId(item.id);
      setError(null);
      const completing = !item.isCompleted;
      try {
        // PATCH toggles both ways so an accidental tick can be undone.
        await togetherService.setDateIdeaCompleted(item.id, completing);
        if (completing) {
          showSuccessOverlay('Date done ❤');
        } else {
          showSuccess('Date idea reopened');
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update the idea.');
        showError('Sorry that failed :(');
      } finally {
        setBusyId(null);
      }
    },
    [busyId, load],
  );

  const deleteItem = useCallback(
    async (item: DateIdeaResponse) => {
      if (busyId) return;
      setBusyId(item.id);
      setError(null);
      try {
        await togetherService.deleteDateIdea(item.id);
        showSuccess('Deleted!');
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete the idea.');
        showError('Sorry that failed :(');
      } finally {
        setBusyId(null);
      }
    },
    [busyId, load],
  );

  /** Deleting can't be undone, so ask first. */
  const handleDelete = useCallback(
    (item: DateIdeaResponse) => {
      Alert.alert('Delete date idea', `Delete "${item.title}" from your date ideas?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteItem(item) },
      ]);
    },
    [deleteItem],
  );

  const handleToggleFavorite = useCallback(
    async (item: DateIdeaResponse) => {
      if (busyId) return;
      setBusyId(item.id);
      setError(null);
      try {
        await togetherService.setDateIdeaFavorite(item.id, !item.isFavorite);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update the idea.');
      } finally {
        setBusyId(null);
      }
    },
    [busyId, load],
  );

  /**
   * Starred (favorite) ideas float to the top; done ideas sink to the bottom.
   * Within each group the original server order is preserved.
   */
  const sortedItems = useMemo(() => {
    const rank = (i: DateIdeaResponse) =>
      i.isCompleted ? 2 : i.isFavorite ? 0 : 1;
    return items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index)
      .map(({ item }) => item);
  }, [items]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Date Ideas" onBack={() => navigation.goBack()} />

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
            ListHeaderComponent={
              <View>
                <Pressable
                  style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
                  onPress={handleAdd}
                  accessibilityRole="button"
                  accessibilityLabel="Add a date idea"
                >
                  <Text style={styles.addBtnText}>+ Add a Date Idea</Text>
                </Pressable>
                <View style={styles.preferencesLink}>
                  <SupportPreferencesLink
                    label="Use their preferences"
                    focusSection="favorites"
                    hint="Favourite places, food, and date ideas your partner shared."
                  />
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <Row
                item={item}
                busy={busyId === item.id}
                onToggleComplete={handleToggleComplete}
                onToggleFavorite={handleToggleFavorite}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onOpenLink={handleOpenLink}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No date ideas yet. Add your first above.
                </Text>
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
  preferencesLink: {
    marginBottom: spacing.md,
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
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowIcon: {
    marginTop: 2,
  },
  rowTextWrap: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
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
  rowDesc: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  rowSub: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
    marginTop: 4,
  },
  doneBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DONE_GREEN,
    backgroundColor: 'rgba(76,175,125,0.12)',
  },
  doneBadgeText: {
    ...typography.bodySm,
    color: DONE_GREEN,
    fontSize: 12,
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
  doneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DONE_GREEN,
  },
  doneBtnText: {
    ...typography.bodySemiBold,
    color: DONE_GREEN,
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
