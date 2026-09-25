/**
 * AddCalendarEventScreen — a real compose form that POSTs a shared calendar
 * event to /api/calendar/events, or edits an existing one.
 *
 * Route params pre-fill the form when it's opened from the calendar:
 *   `date`      → the tapped day ("YYYY-MM-DD")
 *   `startTime` → the tapped hour in the day view ("HH:mm")
 *   `event`     → a full CalendarEventResponse; when present the screen is in
 *                 edit mode: every field is pre-filled, Save issues a PATCH,
 *                 and a Delete button appears at the bottom.
 *
 * The date and both times use `DateTimeField` pickers, so the form can't submit
 * an impossible date. Times are optional: leave them off for an all-day entry,
 * or turn them on to place the event on the day view's hour grid.
 *
 * On success it navigates back; the day view and TogetherHome both refetch on
 * focus so the change appears immediately.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { AppHeader } from '../../../shared/components/header';
import { showSuccess, showError } from '../../../shared/state/bannerStore';
import {
  DateTimeField,
  addMinutes,
  combineDateAndTime,
  parseIsoDate,
  parseTimeString,
  toApiTime,
  toIsoDate,
  KeyboardDoneAccessory,
  KEYBOARD_DONE_ACCESSORY_ID,
  LocationPicker,
  type LocationValue,
} from '../../../shared/components/inputs';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { togetherService } from '../services/togetherService';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'AddCalendarEvent'>;
type Route = NativeStackScreenProps<TogetherStackParamList, 'AddCalendarEvent'>['route'];

/** Default event length when the user turns times on without setting an end. */
const DEFAULT_EVENT_MINUTES = 60;

export function AddCalendarEventScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editingEvent = route.params?.event;
  const isEditing = Boolean(editingEvent);
  // Only the creator may delete (server-enforced); we hide the button otherwise
  // so the person isn't offered an action that will fail. The signed-in user is
  // read from the shared settings cache, populated at app launch.
  const canDelete =
    isEditing &&
    userSettingsStore.get()?.id === editingEvent?.createdByUserId;
  const paramDate = route.params?.date;
  const paramStartTime = route.params?.startTime;

  // A day tapped in the day view's hour grid arrives with a start time, so the
  // event starts out timed; the month grid / Add Event button doesn't. When
  // editing, everything seeds from the event instead.
  const initialDate = useMemo(
    () => parseIsoDate(editingEvent?.eventDate ?? paramDate) ?? new Date(),
    [editingEvent?.eventDate, paramDate],
  );
  const initialStart = useMemo(
    () =>
      combineDateAndTime(
        editingEvent?.eventDate ?? paramDate ?? toIsoDate(new Date()),
        editingEvent?.startTime ?? paramStartTime,
      ),
    [editingEvent?.eventDate, editingEvent?.startTime, paramDate, paramStartTime],
  );

  const [title, setTitle] = useState(editingEvent?.title ?? '');
  const [eventDate, setEventDate] = useState<Date>(initialDate);
  const [timed, setTimed] = useState(
    isEditing
      ? parseTimeString(editingEvent?.startTime) !== null
      : Boolean(paramStartTime),
  );
  const [startTime, setStartTime] = useState<Date>(
    () => initialStart ?? initialDate,
  );
  const [endTime, setEndTime] = useState<Date>(() => {
    const editEnd = combineDateAndTime(
      editingEvent?.eventDate ?? toIsoDate(initialDate),
      editingEvent?.endTime,
    );
    return editEnd ?? addMinutes(initialStart ?? initialDate, DEFAULT_EVENT_MINUTES);
  });
  // The picker gives recommended places (South-Africa-first) plus coordinates,
  // but the calendar API only stores the address string, so we persist that.
  // In edit mode we seed the display string; coordinates aren't stored server-side.
  const [location, setLocation] = useState<LocationValue | null>(
    editingEvent?.location
      ? { location: editingEvent.location, latitude: null, longitude: null }
      : null,
  );
  const [description, setDescription] = useState(editingEvent?.description ?? '');
  const [reminderEnabled, setReminderEnabled] = useState(
    editingEvent?.reminderEnabled ?? false,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endBeforeStart =
    timed &&
    endTime.getHours() * 60 + endTime.getMinutes() <=
      startTime.getHours() * 60 + startTime.getMinutes();

  const canSave = title.trim().length > 0 && !endBeforeStart && !saving;

  // Turning times on seeds a sensible hour rather than midnight.
  const handleToggleTimed = useCallback(
    (next: boolean) => {
      setTimed(next);
      if (!next) return;
      const seed = new Date(eventDate.getTime());
      if (seed.getHours() === 0 && seed.getMinutes() === 0) {
        const now = new Date();
        seed.setHours(now.getHours() + 1, 0, 0, 0);
      }
      setStartTime(seed);
      setEndTime(addMinutes(seed, DEFAULT_EVENT_MINUTES));
    },
    [eventDate],
  );

  // Keep the end time a step ahead of the start the way a calendar app does.
  const handleChangeStart = useCallback(
    (next: Date) => {
      setStartTime(next);
      const startMins = next.getHours() * 60 + next.getMinutes();
      const endMins = endTime.getHours() * 60 + endTime.getMinutes();
      if (endMins <= startMins) setEndTime(addMinutes(next, DEFAULT_EVENT_MINUTES));
    },
    [endTime],
  );

  const handleSave = useCallback(async () => {
    if (!canSave) {
      if (title.trim().length === 0) setError('Give the event a title.');
      else if (endBeforeStart) setError('The end time has to be after the start time.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      title: title.trim(),
      eventDate: toIsoDate(eventDate),
      startTime: timed ? toApiTime(startTime) : null,
      endTime: timed ? toApiTime(endTime) : null,
      location: location?.location.trim() || null,
      description: description.trim() || null,
      reminderEnabled,
      reminderMinutesBefore: reminderEnabled ? 60 : null,
      isShared: true,
    };
    try {
      if (editingEvent) {
        await togetherService.updateCalendarEvent(editingEvent.id, payload);
        showSuccess('Saved!');
      } else {
        await togetherService.createCalendarEvent(payload);
        showSuccess('Created!');
      }
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the event.');
      showError('Sorry that failed :(');
      setSaving(false);
    }
  }, [
    canSave,
    title,
    eventDate,
    timed,
    startTime,
    endTime,
    location,
    description,
    reminderEnabled,
    endBeforeStart,
    editingEvent,
    navigation,
  ]);

  const handleDelete = useCallback(() => {
    if (!editingEvent) return;
    Alert.alert(
      'Delete event',
      `Remove "${editingEvent.title}" from your calendar?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            setError(null);
            try {
              await togetherService.deleteCalendarEvent(editingEvent.id);
              showSuccess('Deleted!');
              navigation.goBack();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not delete the event.');
              showError('Sorry that failed :(');
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [editingEvent, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title={isEditing ? 'Edit Event' : 'New Event'}
        onBack={() => navigation.goBack()}
        showNotificationBell={false}
      />

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
            autoFocus={!isEditing}
          />

          <DateTimeField
            label="Date"
            mode="date"
            value={eventDate}
            onChange={setEventDate}
            pickerTitle="Event date"
            accessibilityLabel="Event date"
            style={styles.field}
          />

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchTitle}>Set a time</Text>
              <Text style={styles.switchSub}>
                Off means it sits at the top of the day
              </Text>
            </View>
            <Switch
              value={timed}
              onValueChange={handleToggleTimed}
              trackColor={{ true: colors.gold, false: colors.border }}
              thumbColor={colors.neutral}
            />
          </View>

          {timed ? (
            <View style={styles.timeRow}>
              <DateTimeField
                label="Starts"
                mode="time"
                value={startTime}
                onChange={handleChangeStart}
                pickerTitle="Start time"
                accessibilityLabel="Start time"
                style={styles.timeCol}
              />
              <DateTimeField
                label="Ends"
                mode="time"
                value={endTime}
                onChange={setEndTime}
                pickerTitle="End time"
                accessibilityLabel="End time"
                invalid={endBeforeStart}
                style={styles.timeCol}
              />
            </View>
          ) : null}
          {endBeforeStart ? (
            <Text style={styles.hint}>The end time has to be after the start time.</Text>
          ) : null}

          <Text style={styles.label}>Location (optional)</Text>
          <LocationPicker
            value={location}
            onChange={setLocation}
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Anything to remember"
            placeholderTextColor={colors.neutralSubtle}
            value={description}
            onChangeText={setDescription}
            multiline
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
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
            disabled={!canSave || deleting}
            accessibilityRole="button"
            accessibilityLabel={isEditing ? 'Save changes' : 'Save event'}
          >
            {saving ? (
              <ActivityIndicator color={colors.ctaText} />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEditing ? 'Save Changes' : 'Save Event'}
              </Text>
            )}
          </Pressable>

          {canDelete ? (
            <Pressable
              style={({ pressed }) => [
                styles.deleteBtn,
                pressed && styles.deleteBtnPressed,
              ]}
              onPress={handleDelete}
              disabled={saving || deleting}
              accessibilityRole="button"
              accessibilityLabel="Delete event"
            >
              {deleting ? (
                <ActivityIndicator color={colors.emergency} />
              ) : (
                <Text style={styles.deleteBtnText}>Delete Event</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <KeyboardDoneAccessory />
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
  field: {
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
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  timeCol: { flex: 1 },
  hint: {
    ...typography.bodySm,
    color: colors.emergency,
    fontSize: 12,
    marginTop: 6,
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
  deleteBtn: {
    marginTop: spacing.sm,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.emergency,
    backgroundColor: colors.emergencyBg,
  },
  deleteBtnPressed: {
    opacity: 0.6,
  },
  deleteBtnText: {
    ...typography.bodySemiBold,
    color: colors.emergency,
    fontSize: 15,
  },
});
