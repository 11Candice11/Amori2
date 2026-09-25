/**
 * DateTimeField — a tappable form field that opens `DateTimePickerModal`.
 *
 * A drop-in replacement for the "type YYYY-MM-DD into a TextInput" pattern:
 * the value is always a real `Date`, so a form can never submit an impossible
 * date like 2025-02-31. Styled to match the app's text inputs (card surface,
 * hairline border, 12px radius).
 */
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, spacing, typography } from '../../theme';
import {
  DateTimePickerModal,
  type DateTimePickerMode,
} from './DateTimePickerModal';
import { formatDateTime, formatMediumDate, formatTimeOfDay } from './dateUtils';

type DateTimeFieldProps = {
  /** Small uppercase label rendered above the field. Omit to render none. */
  label?: string;
  mode?: DateTimePickerMode;
  value: Date | null;
  onChange: (value: Date) => void;
  /** Shown when `value` is null. */
  placeholder?: string;
  /** Heading for the picker sheet. */
  pickerTitle?: string;
  minimumDate?: Date | null;
  maximumDate?: Date | null;
  minuteStep?: number;
  disabled?: boolean;
  /** Draws an error border (e.g. end time before start time). */
  invalid?: boolean;
  /** When provided, an optional value can be cleared from the field. */
  onClear?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// ─── Icons ───────────────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={5}
        width={18}
        height={16}
        rx={3}
        stroke={colors.neutralMuted}
        strokeWidth={1.6}
      />
      <Path
        d="M3 10h18M8 3v4M16 3v4"
        stroke={colors.neutralMuted}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={colors.neutralMuted} strokeWidth={1.6} />
      <Path
        d="M12 7.5V12l3 2"
        stroke={colors.neutralMuted}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClearIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={colors.neutralMuted}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

function formatValue(value: Date, mode: DateTimePickerMode): string {
  if (mode === 'time') return formatTimeOfDay(value);
  if (mode === 'datetime') return formatDateTime(value);
  return formatMediumDate(value);
}

export function DateTimeField({
  label,
  mode = 'date',
  value,
  onChange,
  placeholder,
  pickerTitle,
  minimumDate,
  maximumDate,
  minuteStep = 5,
  disabled = false,
  invalid = false,
  onClear,
  accessibilityLabel,
  style,
}: DateTimeFieldProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = useCallback(
    (next: Date) => {
      setOpen(false);
      onChange(next);
    },
    [onChange],
  );

  const resolvedPlaceholder =
    placeholder ?? (mode === 'time' ? 'Select a time' : 'Select a date');
  const display = value ? formatValue(value, mode) : resolvedPlaceholder;

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.field,
          invalid && styles.fieldInvalid,
          disabled && styles.fieldDisabled,
          pressed && !disabled && styles.fieldPressed,
        ]}
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ?? `${label ?? resolvedPlaceholder}. ${display}`
        }
        accessibilityHint="Opens a picker"
        accessibilityState={{ disabled }}
      >
        {mode === 'time' ? <ClockIcon /> : <CalendarIcon />}
        <Text
          style={[styles.valueText, !value && styles.placeholderText]}
          numberOfLines={1}
        >
          {display}
        </Text>
        {onClear && value && !disabled ? (
          <Pressable
            onPress={onClear}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear"
          >
            <ClearIcon />
          </Pressable>
        ) : null}
      </Pressable>

      <DateTimePickerModal
        visible={open}
        mode={mode}
        value={value}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
        title={pickerTitle ?? (label ? label : undefined)}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        minuteStep={minuteStep}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
    marginBottom: spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  fieldPressed: {
    borderColor: colors.gold,
  },
  fieldInvalid: {
    borderColor: colors.emergency,
  },
  fieldDisabled: {
    opacity: 0.55,
  },
  valueText: {
    ...typography.body,
    color: colors.neutral,
    fontSize: 15,
    flex: 1,
  },
  placeholderText: {
    color: colors.neutralSubtle,
  },
});
