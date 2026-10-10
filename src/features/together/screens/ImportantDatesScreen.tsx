/**
 * ImportantDatesScreen — the couple's shared important dates.
 *
 *   GET    /api/important-dates        → list all
 *   POST   /api/important-dates        → create
 *   PATCH  /api/important-dates/{id}   → update
 *   DELETE /api/important-dates/{id}   → remove
 *
 * A real, data-backed list mirroring the Wishlist screen: pull-to-refresh,
 * loading + empty + error states, an inline add (name + date), and per-row
 * delete (owner-only, backend-enforced). Sorted by the server-computed
 * `daysUntilNext` so the soonest upcoming date is first.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { DateTimeField, toIsoDate } from '../../../shared/components/inputs';
import { showSuccess, showError } from '../../../shared/state/bannerStore';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { togetherService } from '../services/togetherService';
import type { ImportantDateResponse } from '../types/together.types';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'ImportantDates'>;

function DeleteIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={colors.neutralMuted} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** A human countdown from the server-computed daysUntilNext. */
function countdownLabel(days: number | null): string {
  if (days == null) return '';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function Row({
  item,
  busy,
  onDelete,
}: {
  item: ImportantDateResponse;
  busy: boolean;
  onDelete: (item: ImportantDateResponse) => void;
}) {
  const canDelete = userSettingsStore.get()?.id === item.createdByUserId;
  const countdown = countdownLabel(item.daysUntilNext);
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>{item.name}</Text>
        {canDelete ? (
          <Pressable
            onPress={() => onDelete(item)}
            hitSlop={8}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
          >
            <DeleteIcon />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.rowMetaText}>{formatDate(item.date)}</Text>
        {item.isRecurring ? (
          <>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.rowMetaText}>Every year</Text>
          </>
        ) : null}
        {countdown ? (
          <>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.rowMetaAccent}>{countdown}</Text>
          </>
        ) : null}
      </View>
      {item.notes ? (
        <Text style={styles.rowDesc} numberOfLines={2}>
          {item.notes}
        </Text>
      ) : null}
      <Text style={styles.rowOwner}>Added by {item.createdByName}</Text>
    </View>
  );
}

export function ImportantDatesScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<ImportantDateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [recurring, setRecurring] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await togetherService.getImportantDates();
      setItems(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load important dates.');
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
    const trimmed = newName.trim();
    if (!trimmed || !newDate || saving) return;

    setSaving(true);
    setError(null);
    try {
      await togetherService.createImportantDate({
        name: trimmed,
        date: toIsoDate(newDate),
        isRecurring: recurring,
      });
      showSuccessOverlay('Date added');
      setNewName('');
      setNewDate(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the date.');
      showErrorOverlay("Couldn't add date");
    } finally {
      setSaving(false);
    }
  }, [newName, newDate, recurring, saving, load]);

  const handleDelete = useCallback(
    async (item: ImportantDateResponse) => {
      if (busyId) return;
      setBusyId(item.id);
      setError(null);
      try {
        await togetherService.deleteImportantDate(item.id);
        showSuccess('Deleted!');
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete the date.');
        showError('Sorry that failed :(');
      } finally {
        setBusyId(null);
      }
    },
    [busyId, load],
  );

  // Soonest upcoming first; dates with no countdown sink to the bottom.
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const av = a.daysUntilNext ?? Number.MAX_SAFE_INTEGER;
      const bv = b.daysUntilNext ?? Number.MAX_SAFE_INTEGER;
      return av - bv;
    });
  }, [items]);

  const canSave = newName.trim().length > 0 && newDate != null && !saving;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Important Dates" onBack={() => navigation.goBack()} />

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
              <Row item={item} busy={busyId === item.id} onDelete={handleDelete} />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No important dates yet. Add anniversaries, birthdays, and milestones below.
                </Text>
              </View>
            }
            ListFooterComponent={
              <View style={styles.addCard}>
                <TextInput
                  style={styles.input}
                  placeholder="What's the occasion?"
                  placeholderTextColor={colors.neutralSubtle}
                  value={newName}
                  onChangeText={setNewName}
                  editable={!saving}
                />
                <DateTimeField
                  mode="date"
                  value={newDate}
                  onChange={setNewDate}
                  placeholder="Pick a date"
                  style={styles.dateField}
                />
                <Pressable
                  style={styles.recurringRow}
                  onPress={() => setRecurring((r) => !r)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: recurring }}
                  accessibilityLabel="Repeats every year"
                >
                  <View style={[styles.checkbox, recurring && styles.checkboxOn]}>
                    {recurring ? <Text style={styles.checkboxMark}>✓</Text> : null}
                  </View>
                  <Text style={styles.recurringText}>Repeats every year</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    (!canSave || pressed) && styles.saveBtnDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!canSave}
                  accessibilityRole="button"
                  accessibilityLabel="Save important date"
                >
                  <View style={styles.saveBtn}>
                    {saving ? (
                      <ActivityIndicator color={colors.ctaText} size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>Add date</Text>
                    )}
                  </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  row: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowTitle: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 16, flex: 1 },
  rowDesc: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 13, marginTop: 4 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm },
  rowMetaText: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 12 },
  rowMetaAccent: { ...typography.bodySm, color: colors.gold, fontSize: 12 },
  metaDot: { color: colors.neutralSubtle, fontSize: 10 },
  rowOwner: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11, marginTop: spacing.sm },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { ...typography.body, color: colors.neutralMuted, textAlign: 'center' },
  errorText: { ...typography.body, color: colors.neutralMuted, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.ctaBackground, borderRadius: 12, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryText: { ...typography.bodySemiBold, color: colors.ctaText },
  addCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  input: {
    ...typography.body,
    color: colors.neutral,
    fontSize: 15,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  dateField: { marginTop: 0 },
  recurringRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  checkboxMark: { color: colors.ctaText, fontSize: 13, fontWeight: '700' },
  recurringText: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 14 },
  saveBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    // 3D Beveled border effect
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderTopColor: 'rgba(139, 111, 58, 1)',
    borderLeftColor: 'rgba(139, 111, 58, 0.9)',
    borderRightColor: 'rgba(107, 86, 44, 1)',
    borderBottomColor: 'rgba(107, 86, 44, 1.2)',
    shadowColor: colors.gold,
    shadowOffset: { width: 2, height: 8 },
    shadowOpacity: 0.9,
    shadowRadius: 15,
    elevation: 12,
  },
  borderImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    pointerEvents: 'none',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 15 },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(239,68,68,0.2)',
    padding: spacing.md,
  },
  errorBannerText: { ...typography.bodySm, color: colors.emergency, textAlign: 'center', fontSize: 13 },
});
