/**
 * DateIdeasScreen — the couple's shared date ideas.
 *
 * Backed by the dedicated Date Planner API (/api/dates), which stores a richer
 * DateIdea than the bucket list (category, estimated cost, duration):
 *   GET    /api/dates                → list all ideas
 *   POST   /api/dates                → create (defaults to the Romantic category)
 *   PATCH  /api/dates/{id}           → toggle favorite / completion
 *   DELETE /api/dates/{id}           → remove an idea
 *
 * Real, data-backed: pull-to-refresh, loading + empty + error states, inline
 * add, and per-row complete/favorite/delete actions that persist to the
 * backend. Starred ideas float to the top; completed ideas sink to the bottom
 * with a struck-through title and a delete affordance.
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
import { SupportPreferencesLink } from '../../supportProfile/components/SupportPreferencesLink';
import { showSuccess, showError } from '../../../shared/state/bannerStore';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { togetherService } from '../services/togetherService';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import {
  DATE_CATEGORY_DISPLAY,
  DATE_CATEGORY_LABELS,
  type DateIdeaResponse,
} from '../types/together.types';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'DateIdeas'>;

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

// ─── Formatting ───────────────────────────────────────────────────────────────

function categoryLabel(category: number): string | null {
  const key = DATE_CATEGORY_LABELS[category];
  return key ? DATE_CATEGORY_DISPLAY[key] : null;
}

function formatCost(cost: number | null): string | null {
  if (cost == null) return null;
  if (cost === 0) return 'Free';
  return cost.toLocaleString(undefined, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
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
  onDelete,
}: {
  item: DateIdeaResponse;
  busy: boolean;
  onToggleComplete: (item: DateIdeaResponse) => void;
  onToggleFavorite: (item: DateIdeaResponse) => void;
  onDelete: (item: DateIdeaResponse) => void;
}) {
  const category = categoryLabel(item.category);
  const cost = formatCost(item.estimatedCost);
  const duration = formatDuration(item.durationMinutes);
  // Only the creator can delete (backend-enforced), so hide the x for the
  // partner's ideas and keep showing the star instead.
  const canDelete = item.isCompleted && userSettingsStore.get()?.id === item.createdByUserId;
  return (
    <View style={[styles.row, item.isCompleted && styles.rowCompleted]}>
      <View style={styles.rowHeader}>
        <Pressable
          onPress={() => onToggleComplete(item)}
          hitSlop={8}
          disabled={busy}
          style={styles.rowIcon}
          accessibilityRole="button"
          accessibilityLabel={item.isCompleted ? 'Mark not done' : 'Mark complete'}
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

        {canDelete ? (
          <Pressable
            onPress={() => onDelete(item)}
            hitSlop={8}
            disabled={busy}
            style={styles.rowIcon}
            accessibilityRole="button"
            accessibilityLabel="Delete date idea"
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

      {item.location ? <Text style={styles.rowSub}>{item.location}</Text> : null}

      <View style={styles.statusRow}>
        <Text style={[styles.statusText, item.isCompleted && styles.statusDone]}>
          {item.isCompleted ? 'Completed' : 'In progress'}
        </Text>
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
  const [newIdea, setNewIdea] = useState('');
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleSave = useCallback(async () => {
    const trimmed = newIdea.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setError(null);
    try {
      await togetherService.createDateIdea(trimmed);
      showSuccess('Created!');
      setNewIdea('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the date idea.');
      showError('Sorry that failed :(');
    } finally {
      setSaving(false);
    }
  }, [newIdea, saving, load]);

  const handleToggleComplete = useCallback(
    async (item: DateIdeaResponse) => {
      if (busyId) return;
      setBusyId(item.id);
      setError(null);
      try {
        // PATCH toggles both ways so an accidental tick can be undone.
        await togetherService.setDateIdeaCompleted(item.id, !item.isCompleted);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update the idea.');
      } finally {
        setBusyId(null);
      }
    },
    [busyId, load],
  );

  const handleDelete = useCallback(
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
   * Starred (favorite) ideas float to the top; completed ideas sink to the
   * bottom. Within each group the original server order is preserved.
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
            ListHeaderComponent={
              <View style={{ marginBottom: spacing.md }}>
                <SupportPreferencesLink
                  label="Use their preferences"
                  focusSection="favorites"
                  hint="Favourite places, food, and date ideas your partner shared."
                />
              </View>
            }
            renderItem={({ item }) => (
              <Row
                item={item}
                busy={busyId === item.id}
                onToggleComplete={handleToggleComplete}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No date ideas yet. Add your first below.
                </Text>
              </View>
            }
            ListFooterComponent={
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Add a date idea..."
                  placeholderTextColor={colors.neutralSubtle}
                  value={newIdea}
                  onChangeText={setNewIdea}
                  onSubmitEditing={handleSave}
                  returnKeyType="done"
                  editable={!saving}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.saveBtn,
                    (!newIdea.trim() || saving || pressed) && styles.saveBtnDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!newIdea.trim() || saving}
                  accessibilityRole="button"
                  accessibilityLabel="Save date idea"
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
  rowTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.neutralMuted,
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
  statusRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
  },
  statusText: {
    ...typography.bodySm,
    color: colors.primaryLight,
    fontSize: 12,
  },
  statusDone: {
    color: '#4CAF7D',
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
