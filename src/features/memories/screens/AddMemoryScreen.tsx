/**
 * AddMemoryScreen — a real compose form that POSTs a memory to /api/memories.
 *
 * A memory REQUIRES a date and time (when it happened). The date + time inputs
 * are combined into an ISO 8601 date-time string for the API.
 *
 * On success it navigates back; the Memories list refetches on focus so the
 * new memory appears immediately.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography } from '../../../shared/theme';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { memoriesService } from '../services/memoriesService';
import {
  MEMORY_CATEGORY_VALUES,
  type MemoryCategory,
} from '../types/memory.types';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'AddMemory'>;

const CATEGORY_OPTIONS: MemoryCategory[] = [
  'Everyday',
  'Trip',
  'Date',
  'Milestone',
  'Adventure',
  'Celebration',
];

/** Pad a number to two digits. */
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Today's date as "YYYY-MM-DD". */
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The current time as "HH:MM". */
function nowTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Basic "YYYY-MM-DD" shape + range validation. */
function isValidDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return false;
  const month = Number(m[2]);
  const day = Number(m[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

/** Basic 24-hour "HH:MM" shape + range validation. */
function isValidTime(s: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) return false;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

/** Combine a "YYYY-MM-DD" date and "HH:MM" time into a local ISO date-time. */
function toIsoDateTime(date: string, time: string): string {
  const [y, mo, d] = date.trim().split('-').map(Number);
  const [h, mi] = time.trim().split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();
}

export function AddMemoryScreen() {
  const navigation = useNavigation<Nav>();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('Everyday');
  const [memoryDate, setMemoryDate] = useState(todayIso());
  const [memoryTime, setMemoryTime] = useState(nowTime());
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave =
    title.trim().length > 0 &&
    isValidDate(memoryDate) &&
    isValidTime(memoryTime) &&
    !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) {
      if (title.trim().length === 0) setError('Give the memory a title.');
      else if (!isValidDate(memoryDate)) setError('Enter a date as YYYY-MM-DD.');
      else if (!isValidTime(memoryTime)) setError('Enter a time as HH:MM (24-hour).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await memoriesService.create({
        title: title.trim(),
        category: MEMORY_CATEGORY_VALUES[category],
        memoryDateTime: toIsoDateTime(memoryDate, memoryTime),
        location: location.trim() || null,
        description: description.trim() || null,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
      });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the memory.');
      setSaving(false);
    }
  }, [
    canSave,
    title,
    category,
    memoryDate,
    memoryTime,
    location,
    description,
    tags,
    navigation,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={styles.backText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New Memory</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sunset in Santorini"
            placeholderTextColor={colors.neutralSubtle}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORY_OPTIONS.map((c) => {
              const active = c === category;
              return (
                <Pressable
                  key={c}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={c}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.dateTimeRow}>
            <View style={styles.dateCol}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.neutralSubtle}
                value={memoryDate}
                onChangeText={setMemoryDate}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.timeCol}>
              <Text style={styles.label}>Time</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                placeholderTextColor={colors.neutralSubtle}
                value={memoryTime}
                onChangeText={setMemoryTime}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
              />
            </View>
          </View>

          <Text style={styles.label}>Location (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Where did it happen?"
            placeholderTextColor={colors.neutralSubtle}
            value={location}
            onChangeText={setLocation}
          />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="What made this moment special?"
            placeholderTextColor={colors.neutralSubtle}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.label}>Tags (optional, comma-separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="travel, sunset, romantic"
            placeholderTextColor={colors.neutralSubtle}
            value={tags}
            onChangeText={setTags}
            autoCapitalize="none"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              (!canSave || pressed) && styles.saveBtnPressed,
            ]}
            onPress={handleSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel="Save memory"
          >
            {saving ? (
              <ActivityIndicator color={colors.ctaText} />
            ) : (
              <Text style={styles.saveBtnText}>Save Memory</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    minWidth: 60,
    height: 36,
    justifyContent: 'center',
  },
  backText: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 15,
  },
  headerTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  label: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    ...typography.body,
    color: colors.neutral,
    fontSize: 15,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  chipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(197,163,101,0.14)',
  },
  chipText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.gold,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateCol: { flex: 2 },
  timeCol: { flex: 1 },
  error: {
    ...typography.bodySm,
    color: colors.emergency,
    marginTop: spacing.md,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnPressed: {
    opacity: 0.6,
  },
  saveBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 15,
  },
});
