/**
 * FormField / FormLabel — the small gold label + dark input used by the
 * together compose forms (wishlist, date ideas, vision board). ItemComposeForm
 * uses these for its own fields and lets screens drop in extra ones.
 */
import React from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { KEYBOARD_DONE_ACCESSORY_ID } from '../../../shared/components/inputs';

/** The small uppercase gold label above a field. */
export function FormLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

/** A labelled text input. Any TextInput prop can be passed through. */
export function FormField({
  label,
  multiline,
  style,
  ...inputProps
}: TextInputProps & { label: string }) {
  return (
    <>
      <FormLabel>{label}</FormLabel>
      <TextInput
        style={[styles.input, multiline && styles.multiline, style]}
        placeholderTextColor={colors.neutralSubtle}
        multiline={multiline}
        inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
        {...inputProps}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.neutral,
    ...typography.body,
    fontSize: 15,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
});
