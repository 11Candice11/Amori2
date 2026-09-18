/**
 * AddTimelineEventScreen — record a relationship milestone.
 *
 * POSTs a real /api/timeline event. The user picks a milestone type, a title,
 * an event date (YYYY-MM-DD), and optional description/location. On success we
 * pop back to the timeline, which refetches on focus.
 */
import React, { useCallback, useMemo, useState } from 'react';
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
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import type { TimelineStackParamList } from '../../../navigation/TimelineStackParamList';
import type { TimelineEventType } from '../../../services/api/types';
import { timelineService } from '../services/timelineService';
import {
  TIMELINE_EVENT_EMOJI,
  TIMELINE_EVENT_LABELS,
  TIMELINE_EVENT_ORDER,
} from '../types/timeline.types';

type Nav = NativeStackNavigationProp<TimelineStackParamList, 'AddTimelineEvent'>;

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={colors.neutral} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Today as "YYYY-MM-DD" in local time. */
function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Validate a "YYYY-MM-DD" string represents a real calendar date. */
function isValidIsoDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return (
    date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d
  );
}

export function AddTimelineEventScreen() {
  const navigation = useNavigation<Nav>();

  const [eventType, setEventType] = useState<TimelineEventType>('FirstDate');
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateValid = useMemo(() => isValidIsoDate(eventDate), [eventDate]);
  const canSave = title.trim().length > 0 && dateValid && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await timelineService.createEvent({
        title: title.trim(),
        eventDate: eventDate.trim(),
        description,
        location,
        eventType,
      });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this milestone.');
      setSaving(false);
    }
  }, [canSave, title, eventDate, description, location, eventType, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <BackIcon />
        </Pressable>
        <Text style={styles.headerKicker}>NEW MILESTONE</Text>
        <View style={styles.iconBtn} />
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
          <Text style={styles.title}>Mark a moment</Text>
          <Text style={styles.subtitle}>A milestone worth remembering, together.</Text>

          {/* Type selector */}
          <Text style={styles.label}>Type</Text>
          <View style={styles.chipWrap}>
            {TIMELINE_EVENT_ORDER.map((t) => {
              const active = t === eventType;
              return (
                <Pressable
                  key={t}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setEventType(t)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={TIMELINE_EVENT_LABELS[t]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {TIMELINE_EVENT_EMOJI[t]} {TIMELINE_EVENT_LABELS[t]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Title */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. The night we met"
            placeholderTextColor={colors.neutralSubtle}
            maxLength={120}
            accessibilityLabel="Milestone title"
          />

          {/* Date */}
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={[styles.input, !dateValid && eventDate.length > 0 && styles.inputError]}
            value={eventDate}
            onChangeText={setEventDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.neutralSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={10}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel="Event date, format year dash month dash day"
          />
          {!dateValid && eventDate.length > 0 ? (
            <Text style={styles.hint}>Use the format YYYY-MM-DD.</Text>
          ) : null}

          {/* Location */}
          <Text style={styles.label}>Location (optional)</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. The Roast café"
            placeholderTextColor={colors.neutralSubtle}
            maxLength={120}
            accessibilityLabel="Location"
          />

          {/* Description */}
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="What made it special?"
            placeholderTextColor={colors.neutralSubtle}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            accessibilityLabel="Note"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel="Save milestone"
          >
            {saving ? (
              <ActivityIndicator color={colors.ctaText} />
            ) : (
              <Text style={styles.saveBtnText}>Save milestone</Text>
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
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerKicker: { ...typography.label, color: colors.gold, fontSize: 11, letterSpacing: 1.5 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.headlineSm, color: colors.neutral, fontSize: 26 },
  subtitle: { ...typography.body, color: colors.neutralMuted, fontSize: 14, marginTop: 4 },
  label: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  chipActive: { borderColor: colors.gold, backgroundColor: 'rgba(197,163,101,0.16)' },
  chipText: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 13 },
  chipTextActive: { color: colors.gold },
  input: {
    ...typography.body,
    color: colors.neutral,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 120 },
  inputError: { borderColor: colors.emergency },
  hint: { ...typography.bodySm, color: colors.emergency, fontSize: 12, marginTop: 6 },
  error: { ...typography.bodySm, color: colors.emergency, marginTop: spacing.md },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 26,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 16 },
});
