/**
 * SharedCollections — the couple's shared lists.
 *
 * Two real, backend-backed tabs:
 *   - Bucket List → GET/POST /api/bucket-list (filtered by category)
 *   - To-Do List  → GET/POST /api/bucket-list (category: ToDoList)
 *
 * Note: Wishlist and Date Ideas live in the Private Repositories section as
 * dedicated cards.
 *
 * Every field shown maps to a real response field (added-by, target date,
 * location, completion, favorite, price, priority). There is no funding/
 * progress model or cover image on the backend, so none is shown. The footer
 * input creates a real bucket-list item with the appropriate category.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import {
  type BucketListItemResponse,
} from '../types/together.types';

export type CollectionTab = 'bucket' | 'todo';

// ─── Icons ──────────────────────────────────────────────────────────────────

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
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
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke="#4CAF7D" strokeWidth={1.5} />
      <Path d="M8 12l3 3 5-6" stroke="#4CAF7D" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CircleIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
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

// ─── Formatting helpers ─────────────────────────────────────────────────────

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** "YYYY-MM-DD" → "Jun 2025" (or the raw string if unparseable). */
function formatTargetDate(s: string | null): string | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  const monthIdx = Number(m[2]) - 1;
  return `${MONTHS_SHORT[monthIdx] ?? m[2]} ${m[1]}`;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function BucketRow({
  item,
  busy,
  onToggleComplete,
  onDelete,
}: {
  item: BucketListItemResponse;
  busy?: boolean;
  onToggleComplete?: (item: BucketListItemResponse) => void;
  onDelete?: (item: BucketListItemResponse) => void;
}) {
  const target = formatTargetDate(item.targetDate);
  // The API serializes the category as its string name, so it's display-ready.
  const category = item.category;
  // Only the owner can delete (the backend enforces this too), so hide the x
  // for the partner's items.
  const canDelete = item.isCompleted && userSettingsStore.get()?.id === item.addedByUserId;
  return (
    <View style={[styles.item, item.isCompleted && styles.itemCompleted]}>
      <View style={styles.itemHeaderRow}>
        <Pressable
          onPress={() => onToggleComplete?.(item)}
          hitSlop={8}
          disabled={busy}
          style={styles.itemIcon}
          accessibilityRole="button"
          accessibilityLabel={item.isCompleted ? 'Mark not done' : 'Mark complete'}
        >
          {item.isCompleted ? <CheckCircleIcon /> : <CircleIcon />}
        </Pressable>

        <View style={styles.itemTextWrap}>
          <Text style={[styles.itemTitle, item.isCompleted && styles.itemTitleDone]}>
            {item.title}
          </Text>
          <View style={styles.itemMetaRow}>
            <Text style={styles.itemMeta}>Added by {item.addedByName}</Text>
            {category ? (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.itemMeta}>{category}</Text>
              </>
            ) : null}
            {target ? (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.itemMetaAccent}>Target: {target}</Text>
              </>
            ) : null}
          </View>
        </View>

        {canDelete ? (
          <Pressable
            onPress={() => onDelete?.(item)}
            hitSlop={8}
            disabled={busy}
            style={styles.itemIcon}
            accessibilityRole="button"
            accessibilityLabel="Delete item"
          >
            <DeleteIcon />
          </Pressable>
        ) : item.isFavorite ? (
          <StarIcon filled />
        ) : null}
      </View>

      {item.location ? (
        <Text style={styles.itemSub}>{item.location}</Text>
      ) : null}

      <View style={styles.statusRow}>
        <Text style={[styles.statusText, item.isCompleted && styles.statusDone]}>
          {item.isCompleted ? 'Completed' : 'In progress'}
        </Text>
      </View>
    </View>
  );
}

function EmptyList({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type SharedCollectionsProps = {
  bucketList: BucketListItemResponse[];
  todoList: BucketListItemResponse[];
  loading?: boolean;
  /** Called with the new title; the screen performs the create + refresh. */
  onAddBucketItem?: (title: string) => void | Promise<void>;
  onAddTodoItem?: (title: string) => void | Promise<void>;
  onToggleBucketComplete?: (item: BucketListItemResponse) => void;
  onToggleTodoComplete?: (item: BucketListItemResponse) => void;
  onDeleteBucketItem?: (item: BucketListItemResponse) => void;
  onDeleteTodoItem?: (item: BucketListItemResponse) => void;
  /** Id of a row with an action in flight, to disable its buttons. */
  busyId?: string | null;
  saving?: boolean;
};

export function SharedCollections({
  bucketList,
  todoList,
  loading = false,
  onAddBucketItem,
  onAddTodoItem,
  onToggleBucketComplete,
  onToggleTodoComplete,
  onDeleteBucketItem,
  onDeleteTodoItem,
  busyId = null,
  saving = false,
}: SharedCollectionsProps) {
  const [activeTab, setActiveTab] = useState<CollectionTab>('bucket');
  const [draft, setDraft] = useState('');

  const tabs: { key: CollectionTab; label: string; count: number }[] = [
    { key: 'bucket', label: 'Bucket List', count: bucketList.length },
    { key: 'todo', label: 'To-Do List', count: todoList.length },
  ];

  const handleSave = async () => {
    const text = draft.trim();
    if (!text || saving) return;
    
    if (activeTab === 'bucket') {
      await onAddBucketItem?.(text);
    } else if (activeTab === 'todo') {
      await onAddTodoItem?.(text);
    }
    
    setDraft('');
  };

  return (
    <View>
      {/* Tabs */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label}, ${tab.count} items`}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label} ({tab.count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : activeTab === 'bucket' ? (
        <>
          {bucketList.length === 0 ? (
            <EmptyList message="No bucket-list dreams yet. Add your first below." />
          ) : (
            bucketList.map((item) => (
              <BucketRow
                key={item.id}
                item={item}
                busy={busyId === item.id}
                onToggleComplete={onToggleBucketComplete}
                onDelete={onDeleteBucketItem}
              />
            ))
          )}

          {/* Add-to-list footer */}
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="Add to Bucket List…"
              placeholderTextColor={colors.neutralSubtle}
              value={draft}
              onChangeText={setDraft}
              returnKeyType="done"
              editable={!saving}
              onSubmitEditing={handleSave}
            />
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                (pressed || saving) && styles.pressed,
              ]}
              onPress={handleSave}
              disabled={saving}
              android_ripple={{ color: 'rgba(10,20,15,0.15)' }}
              accessibilityRole="button"
              accessibilityLabel="Save item"
            >
              {saving ? (
                <ActivityIndicator color={colors.ctaText} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </Pressable>
          </View>
        </>
      ) : activeTab === 'todo' ? (
        <>
          {todoList.length === 0 ? (
            <EmptyList message="No to-do items yet. Add your first below." />
          ) : (
            todoList.map((item) => (
              <BucketRow
                key={item.id}
                item={item}
                busy={busyId === item.id}
                onToggleComplete={onToggleTodoComplete}
                onDelete={onDeleteTodoItem}
              />
            ))
          )}

          {/* Add-to-list footer */}
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="Add to To-Do List…"
              placeholderTextColor={colors.neutralSubtle}
              value={draft}
              onChangeText={setDraft}
              returnKeyType="done"
              editable={!saving}
              onSubmitEditing={handleSave}
            />
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                (pressed || saving) && styles.pressed,
              ]}
              onPress={handleSave}
              disabled={saving}
              android_ripple={{ color: 'rgba(10,20,15,0.15)' }}
              accessibilityRole="button"
              accessibilityLabel="Save item"
            >
              {saving ? (
                <ActivityIndicator color={colors.ctaText} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  tabActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(197,163,101,0.08)',
  },
  tabLabel: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: colors.gold,
    fontFamily: typography.bodySemiBold.fontFamily,
  },

  loadingBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },

  // Item card
  item: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemCompleted: {
    opacity: 0.6,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  itemIcon: {
    marginTop: 2,
  },
  itemTextWrap: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 17,
  },
  itemTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.neutralMuted,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  itemMeta: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },
  itemMetaAccent: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 12,
  },
  metaDot: {
    color: colors.neutralSubtle,
    fontSize: 10,
  },
  itemSub: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
    marginTop: spacing.sm,
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

  // Add row
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addInput: {
    flex: 1,
    ...typography.body,
    color: colors.neutral,
    fontSize: 14,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  saveBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  saveBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 13,
  },

  // Empty state
  emptyState: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
