/**
 * TimePicker — a cross-platform time picker component.
 *
 * On iOS, displays a native DateTimePicker when tapped.
 * On Android, opens the native time picker dialog.
 */
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, typography } from '../theme';

// DateTimePicker is optional — gracefully degrade if not available.
let DateTimePicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch {
  // Not installed — we'll show a fallback message.
}

function ClockIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
        stroke={colors.gold}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 6v6l4 2"
        stroke={colors.gold}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface TimePickerProps {
  /** Current time in "HH:MM" format (24-hour). */
  value: string;
  /** Called when the user selects a new time. */
  onChange: (timeStr: string) => void;
  /** Whether the picker is disabled. */
  disabled?: boolean;
}

/**
 * Parse a time string "HH:MM" into a Date object (with today's date).
 * Falls back to 09:00 if parsing fails.
 */
function parseTimeToDate(timeStr: string): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
  if (!match) {
    const fallback = new Date();
    fallback.setHours(9, 0, 0, 0);
    return fallback;
  }
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * Format a Date object as "HH:MM" in 24-hour format.
 */
function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Format a time string "HH:MM" for display (12-hour with AM/PM).
 */
function formatTimeForDisplay(timeStr: string): string {
  const date = parseTimeToDate(timeStr);
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12; // Convert 0 to 12 for midnight
  const mm = m.toString().padStart(2, '0');
  return `${h}:${mm} ${ampm}`;
}

export function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(() => parseTimeToDate(value));

  const handlePress = () => {
    if (disabled) return;
    setTempDate(parseTimeToDate(value));
    setShowPicker(true);
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'dismissed') {
      return;
    }

    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        // On Android, confirm immediately when user selects.
        onChange(formatTime(selectedDate));
      }
    }
  };

  const handleConfirm = () => {
    onChange(formatTime(tempDate));
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  if (!DateTimePicker) {
    // Fallback when @react-native-community/datetimepicker is not installed.
    return (
      <Pressable
        style={[styles.button, disabled && styles.buttonDisabled]}
        disabled
      >
        <ClockIcon size={18} />
        <Text style={[styles.buttonText, styles.buttonTextDisabled]}>
          Time picker unavailable
        </Text>
      </Pressable>
    );
  }

  return (
    <View>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          disabled && styles.buttonDisabled,
          pressed && !disabled && styles.buttonPressed,
        ]}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Reminder time: ${formatTimeForDisplay(value)}`}
      >
        <ClockIcon size={18} />
        <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
          {formatTimeForDisplay(value)}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' && showPicker && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <Pressable style={styles.modalOverlay} onPress={handleCancel}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Pressable onPress={handleCancel} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Reminder Time</Text>
                <Pressable onPress={handleConfirm} style={styles.modalButton}>
                  <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="time"
                display="spinner"
                onChange={handleChange}
                textColor={colors.neutral}
                themeVariant="dark"
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onChange={handleChange}
          is24Hour={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(139,111,58,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139,111,58,0.25)',
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 14,
  },
  buttonTextDisabled: {
    color: colors.neutralMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
  },
  modalButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 60,
  },
  modalButtonText: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 15,
  },
  modalButtonTextConfirm: {
    ...typography.bodySemiBold,
    color: colors.gold,
  },
});
