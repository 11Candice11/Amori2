/**
 * VisionBoardItemDetailScreen — a single "Us" Vision Board item.
 *
 *   GET /api/vision-board/items/{id}
 *
 * Actions: edit, pin/unpin, move to another section, delete, and the completion
 * flow (mark achieved with an optional note, or un-complete). Once achieved, the
 * couple can optionally turn the moment into a Memory or a Timeline milestone —
 * always behind an explicit confirmation, reusing the existing Memories and
 * Timeline creation flows. Both partners may act on shared items.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { showSuccess, showError } from '../../../shared/state/bannerStore';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import { toIsoDate } from '../../../shared/components/inputs';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { visionBoardService } from '../services/visionBoardService';
import { memoriesService } from '../../memories/services/memoriesService';
import { timelineService } from '../../timeline/services/timelineService';
import {
  MEMORY_CATEGORY_VALUES,
  MEMORY_MEDIA_TYPE_VALUES,
} from '../../memories/types/memory.types';
import {
  VISION_BOARD_ITEM_TYPE_LABELS,
  decodeVisionBoardItemType,
  type VisionBoardItemResponse,
  type VisionBoardSectionResponse,
} from '../types/visionBoard.types';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'VisionBoardItemDetail'>;
type Rt = RouteProp<TogetherStackParamList, 'VisionBoardItemDetail'>;

function ownershipLabel(item: VisionBoardItemResponse): string {
  const myId = userSettingsStore.get()?.id;
  if (myId && item.createdByUserId === myId) return 'Added by you';
  const name = item.createdByName?.trim();
  return name ? `Added by ${name}` : 'Added by partner';
}

function formatBudget(budget: number | null): string | null {
  if (budget == null) return null;
  return budget.toLocaleString(undefined, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}

export function VisionBoardItemDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { itemId } = route.params;

  const [item, setItem] = useState<VisionBoardItemResponse | null>(null);
  const [sections, setSections] = useState<VisionBoardSectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Completion note modal
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeNote, setCompleteNote] = useState('');
  // Move (section picker) modal
  const [moveModalOpen, setMoveModalOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [fetched, fetchedSections] = await Promise.all([
        visionBoardService.getItem(itemId),
        visionBoardService.getSections().catch(() => [] as VisionBoardSectionResponse[]),
      ]);
      setItem(fetched);
      setSections(fetchedSections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this item.');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // ── Actions ──────────────────────────────────────────────────────────────
  const runAction = useCallback(
    async (
      fn: () => Promise<unknown>,
      failMsg: string,
      // For create-like actions, show the centered failure overlay (the
      // counterpart to their success overlay) instead of the top banner.
      errorOverlayMessage?: string,
    ) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        await fn();
        await load();
      } catch (err) {
        const message = err instanceof Error ? err.message : failMsg;
        setError(message);
        if (errorOverlayMessage) {
          showErrorOverlay(errorOverlayMessage);
        } else {
          showError('Sorry that failed :(');
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, load],
  );

  const handleTogglePin = useCallback(() => {
    if (!item) return;
    runAction(() => visionBoardService.setPinned(item.id, !item.isPinned), 'Could not update.');
  }, [item, runAction]);

  const handleEdit = useCallback(() => {
    if (!item) return;
    navigation.navigate('AddVisionBoardItem', { itemId: item.id });
  }, [item, navigation]);

  const handleDelete = useCallback(() => {
    if (!item) return;
    Alert.alert('Remove from vision', `Remove "${item.title}" from your Vision Board?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          runAction(async () => {
            await visionBoardService.deleteItem(item.id);
            showSuccess('Removed');
            navigation.goBack();
          }, 'Could not remove.'),
      },
    ]);
  }, [item, runAction, navigation]);

  const openCompleteModal = useCallback(() => {
    setCompleteNote('');
    setCompleteModalOpen(true);
  }, []);

  const confirmComplete = useCallback(() => {
    if (!item) return;
    const note = completeNote.trim();
    setCompleteModalOpen(false);
    runAction(async () => {
      await visionBoardService.completeItem(item.id, { completedNote: note || null });
      showSuccessOverlay('We did it ❤');
    }, 'Could not complete.', "Couldn't complete");
  }, [item, completeNote, runAction]);

  const handleUncomplete = useCallback(() => {
    if (!item) return;
    runAction(() => visionBoardService.uncompleteItem(item.id), 'Could not update.');
  }, [item, runAction]);

  const handleMove = useCallback(
    (sectionId: string) => {
      if (!item) return;
      setMoveModalOpen(false);
      if (sectionId === item.sectionId) return;
      runAction(() => visionBoardService.moveItem(item.id, { sectionId }), 'Could not move.');
    },
    [item, runAction],
  );

  // ── Add to Memories (explicit confirmation, reuses Memories flow) ───────────
  const handleAddToMemories = useCallback(() => {
    if (!item) return;
    Alert.alert(
      'Add to Memories?',
      `Create a memory from "${item.title}"? You can edit it afterwards.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to Memories',
          onPress: () =>
            runAction(async () => {
              const memory = await memoriesService.create({
                title: item.title,
                description: item.completedNote ?? item.description ?? null,
                category: MEMORY_CATEGORY_VALUES.Milestone,
                // Use the achievement date when present, else now.
                memoryDateTime: (item.completedAt ?? new Date().toISOString()),
                location: item.locationName ?? null,
                latitude: item.latitude ?? null,
                longitude: item.longitude ?? null,
              });
              // Carry the vision's photo across when it has one.
              if (item.imageFileKey) {
                try {
                  await memoriesService.addMedia(memory.id, {
                    fileKey: item.imageFileKey,
                    mediaType: MEMORY_MEDIA_TYPE_VALUES.Photo,
                  });
                } catch {
                  // The memory was still created; the photo is a best-effort extra.
                }
              }
              showSuccessOverlay('Added to Memories');
            }, 'Could not add to Memories.', "Couldn't add to Memories"),
        },
      ],
    );
  }, [item, runAction]);

  // ── Add to Timeline (explicit confirmation, reuses Timeline flow) ───────────
  const handleAddToTimeline = useCallback(() => {
    if (!item) return;
    Alert.alert(
      'Add to Timeline?',
      `Add "${item.title}" to your relationship timeline as a milestone?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to Timeline',
          onPress: () =>
            runAction(async () => {
              const eventDate = item.completedAt
                ? toIsoDate(new Date(item.completedAt))
                : toIsoDate(new Date());
              await timelineService.createEvent({
                title: item.title,
                description: item.completedNote ?? item.description ?? null,
                eventDate,
                location: item.locationName ?? null,
                latitude: item.latitude ?? null,
                longitude: item.longitude ?? null,
                eventType: 'Custom',
                photoKeys: item.imageFileKey ? [item.imageFileKey] : [],
              });
              showSuccessOverlay('Added to Timeline');
            }, 'Could not add to Timeline.', "Couldn't add to Timeline"),
        },
      ],
    );
  }, [item, runAction]);

  const imageUrl = useMemo(() => (item ? resolveMediaUrl(item.imageUrl) : ''), [item]);
  const currentSection = sections.find((s) => s.id === item?.sectionId);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Vision" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Vision" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'This item is no longer available.'}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const typeLabel = VISION_BOARD_ITEM_TYPE_LABELS[decodeVisionBoardItemType(item.type)];
  const budgetLabel = formatBudget(item.budget);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Vision" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.hero} resizeMode="cover" /> : null}

        <View style={styles.topRow}>
          <Text style={styles.type}>{typeLabel.toUpperCase()}</Text>
          <Pressable onPress={handleTogglePin} disabled={busy} hitSlop={8}>
            <Text style={styles.pin}>{item.isPinned ? '★ Pinned' : '☆ Pin'}</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.owner}>{ownershipLabel(item)}</Text>

        {currentSection ? (
          <Text style={styles.sectionLine}>On “{currentSection.name}”</Text>
        ) : null}

        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

        {/* Details */}
        <View style={styles.detailBlock}>
          {item.locationName ? (
            <DetailRow label="Location" value={item.locationName} />
          ) : null}
          {item.targetDate ? (
            <DetailRow label="Target horizon" value={new Date(item.targetDate).toDateString()} />
          ) : null}
          {budgetLabel ? <DetailRow label="Target budget" value={budgetLabel} /> : null}
          {item.externalReference ? (
            <DetailRow label="Inspiration" value={item.externalReference} />
          ) : null}
          {item.notes ? <DetailRow label="Notes" value={item.notes} /> : null}
        </View>

        {/* Completion state */}
        {item.isCompleted ? (
          <View style={styles.achievedCard}>
            <Text style={styles.achievedLabel}>ACHIEVED</Text>
            {item.completedAt ? (
              <Text style={styles.achievedDate}>{new Date(item.completedAt).toDateString()}</Text>
            ) : null}
            {item.completedNote ? (
              <Text style={styles.achievedNote}>“{item.completedNote}”</Text>
            ) : null}
          </View>
        ) : null}

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}

        {/* Primary action */}
        {item.isCompleted ? (
          <>
            <View style={styles.followUpRow}>
              <Pressable
                style={({ pressed }) => [styles.followBtn, pressed && styles.pressed]}
                onPress={handleAddToMemories}
                disabled={busy}
              >
                <Text style={styles.followBtnText}>Add to Memories</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.followBtn, pressed && styles.pressed]}
                onPress={handleAddToTimeline}
                disabled={busy}
              >
                <Text style={styles.followBtnText}>Add to Timeline</Text>
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              onPress={handleUncomplete}
              disabled={busy}
            >
              <Text style={styles.secondaryBtnText}>Mark as not yet achieved</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, (busy || pressed) && styles.pressed]}
            onPress={openCompleteModal}
            disabled={busy}
          >
            <Text style={styles.primaryBtnText}>We did it — mark achieved</Text>
          </Pressable>
        )}

        {/* Manage */}
        <View style={styles.manageRow}>
          <Pressable style={styles.manageBtn} onPress={handleEdit} disabled={busy}>
            <Text style={styles.manageBtnText}>Edit</Text>
          </Pressable>
          <Pressable
            style={styles.manageBtn}
            onPress={() => setMoveModalOpen(true)}
            disabled={busy || sections.length <= 1}
          >
            <Text style={styles.manageBtnText}>Move</Text>
          </Pressable>
          <Pressable style={styles.manageBtn} onPress={handleDelete} disabled={busy}>
            <Text style={[styles.manageBtnText, styles.deleteText]}>Remove</Text>
          </Pressable>
        </View>

        {busy ? <ActivityIndicator color={colors.gold} style={styles.busySpinner} /> : null}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Complete note modal */}
      <Modal visible={completeModalOpen} transparent animationType="fade" onRequestClose={() => setCompleteModalOpen(false)}>
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>We did it ❤</Text>
            <Text style={styles.modalSub}>Add a note about the moment (optional).</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="How it felt, where you were…"
              placeholderTextColor={colors.neutralSubtle}
              value={completeNote}
              onChangeText={setCompleteNote}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setCompleteModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={confirmComplete}>
                <Text style={styles.modalConfirmText}>Mark achieved</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Move section modal */}
      <Modal visible={moveModalOpen} transparent animationType="fade" onRequestClose={() => setMoveModalOpen(false)}>
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Move to a shelf</Text>
            <ScrollView style={styles.sectionList}>
              {sections
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((s) => (
                  <Pressable
                    key={s.id}
                    style={[styles.sectionOption, s.id === item.sectionId && styles.sectionOptionActive]}
                    onPress={() => handleMove(s.id)}
                  >
                    <Text style={styles.sectionOptionText}>{s.name}</Text>
                    {s.id === item.sectionId ? <Text style={styles.sectionOptionCheck}>✓</Text> : null}
                  </Pressable>
                ))}
            </ScrollView>
            <Pressable style={styles.modalCancel} onPress={() => setMoveModalOpen(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  pressed: { opacity: 0.85 },

  hero: { width: '100%', height: 210, borderRadius: 16, backgroundColor: colors.surface, marginBottom: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  type: { ...typography.label, color: colors.gold, letterSpacing: 0.8, fontSize: 11 },
  pin: { ...typography.bodySemiBold, color: colors.gold, fontSize: 13 },
  title: { ...typography.headline, color: colors.neutral, fontSize: 24, marginTop: 4 },
  owner: { ...typography.bodySm, color: colors.neutralSubtle, marginTop: 4 },
  sectionLine: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 2 },
  description: { ...typography.body, color: colors.neutralMuted, marginTop: spacing.md, lineHeight: 22 },

  detailBlock: { marginTop: spacing.md, gap: spacing.sm },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 6,
    gap: spacing.md,
  },
  detailLabel: { ...typography.bodySm, color: colors.neutralSubtle },
  detailValue: { ...typography.bodySm, color: colors.neutral, flexShrink: 1, textAlign: 'right' },

  achievedCard: {
    backgroundColor: 'rgba(197,163,101,0.10)',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 14,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  achievedLabel: { ...typography.label, color: colors.gold, letterSpacing: 1 },
  achievedDate: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 4 },
  achievedNote: { ...typography.body, color: colors.neutral, fontStyle: 'italic', marginTop: 6 },

  inlineError: { ...typography.bodySm, color: colors.emergency, marginTop: spacing.md },

  primaryBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: spacing.lg,
  },
  primaryBtnText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 15 },

  followUpRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  followBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(197,163,101,0.12)',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  followBtnText: { ...typography.bodySemiBold, color: colors.gold, fontSize: 13 },

  secondaryBtn: { alignItems: 'center', paddingVertical: 12, marginTop: spacing.sm },
  secondaryBtnText: { ...typography.bodySm, color: colors.neutralSubtle },

  manageRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  manageBtn: { paddingHorizontal: spacing.md, paddingVertical: 8 },
  manageBtnText: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 13 },
  deleteText: { color: colors.emergency },

  busySpinner: { marginTop: spacing.md },
  bottomPad: { height: spacing.xl },

  errorText: { ...typography.body, color: colors.neutralMuted, textAlign: 'center' },
  retryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  retryText: { ...typography.bodySemiBold, color: colors.ctaText },

  // Modals
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.headlineSm, color: colors.neutral, fontSize: 18 },
  modalSub: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 4, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.neutral,
    ...typography.body,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md },
  modalCancel: { paddingHorizontal: spacing.md, paddingVertical: 10, alignItems: 'center' },
  modalCancelText: { ...typography.bodySemiBold, color: colors.neutralMuted },
  modalConfirm: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  modalConfirmText: { ...typography.bodySemiBold, color: colors.ctaText },

  sectionList: { maxHeight: 280 },
  sectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
  },
  sectionOptionActive: { backgroundColor: 'rgba(197,163,101,0.12)' },
  sectionOptionText: { ...typography.body, color: colors.neutral },
  sectionOptionCheck: { color: colors.gold, fontSize: 16 },
});
