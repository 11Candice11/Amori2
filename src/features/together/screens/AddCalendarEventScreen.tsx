/**
 * AddCalendarEventScreen — a real compose form that POSTs a shared calendar
 * event to /api/calendar/events. When opened from a tapped calendar day, the
 * `date` route param pre-fills the date field.
 *
 * On success it navigates back; TogetherHome refetches on focus so the new
 * event appears immediately.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { colors, spacing, typography } from '../../../shared/theme';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { togetherService } from '../services/togetherService';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'AddCalendarEvent'>;
type Route = NativeStackScreenProps<TogetherStackParamList, 'AddCalendarEvent'>['route'];

/** Today's date as "YYYY-MM-DD". */
function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Basic "YYYY-MM-DD" shape validation. */
function isValidDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return false;
  const month = Number(m[2]);
  const day = Number(m[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

export function AddCalendarEventScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const initialDate = route.params?.date ?? todayIso();

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(initialDate);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = title.trim().length > 0 && isValidDate(eventDate) && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) {
      if (!isValidDate(eventDate)) setError('Enter a date as YYYY-MM-DD.');
      else if (title.trim().length === 0) setError('Give the event a title.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await togetherService.createCalendarEvent({
        title: title.trim(),
        eventDate: eventDate.trim(),
        location: location.trim() || null,
        description: description.trim() || null,
        reminderEnabled,
        reminderMinutesBefore: reminderEnabled ? 60 : null,
        isShared: true,
      });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the event.');
      setSaving(false);
    }
  }, [canSave, title, eventDate, location, description, reminderEnabled, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New Event</Text>
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
            placeholder="e.g. Anniversary dinner"
            placeholderTextColor={colors.neutralSubtle}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.neutralSubtle}
            value={eventDate}
            onChangeText={setEventDate}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Location (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Where is it?"
            placeholderTextColor={colors.neutralSubtle}
            value={location}
            onChangeText={setLocation}
          />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Anything to remember"
            placeholderTextColor={colors.neutralSubtle}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchTitle}>Remind us</Text>
              <Text style={styles.switchSub}>An hour before the event</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ true: colors.gold, false: colors.border }}
              thumbColor={colors.neutral}
            />
          </View>

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
            accessibilityLabel="Save event"
          >
            {saving ? (
              <ActivityIndicator color={colors.ctaText} />
            ) : (
              <Text style={styles.saveBtnText}>Save Event</Text>
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  switchText: { flex: 1, gap: 2 },
  switchTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 15,
  },
  switchSub: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },
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
