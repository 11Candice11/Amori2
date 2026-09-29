/**
 * Presentational primitives for the Support Preferences editors and partner
 * view. Styling follows the app's dark + gold tokens (mirrors SplittingPrimitives).
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import type { FieldVisibility } from '../types/supportProfile.types';

// ── Privacy toggle (Shared / Private) ─────────────────────────────────────────

export function PrivacyToggle({
  visibility,
  onChange,
}: {
  visibility: FieldVisibility;
  onChange: (next: FieldVisibility) => void;
}) {
  const isShared = visibility === 'Shared';
  return (
    <Pressable
      onPress={() => onChange(isShared ? 'Private' : 'Shared')}
      accessibilityRole="switch"
      accessibilityState={{ checked: !isShared }}
      accessibilityLabel={isShared ? 'Shared with partner' : 'Private'}
      style={[styles.privacyPill, isShared ? styles.privacyShared : styles.privacyPrivate]}
      hitSlop={8}
    >
      <Text style={[styles.privacyText, isShared ? styles.privacyTextShared : styles.privacyTextPrivate]}>
        {isShared ? '● Shared' : '🔒 Private'}
      </Text>
    </Pressable>
  );
}

// ── Free-form text field with privacy toggle ──────────────────────────────────

export function TextFieldEditor({
  label,
  value,
  visibility,
  placeholder,
  multiline,
  onChangeText,
  onChangeVisibility,
}: {
  label: string;
  value: string;
  visibility: FieldVisibility;
  placeholder?: string;
  multiline?: boolean;
  onChangeText: (text: string) => void;
  onChangeVisibility: (v: FieldVisibility) => void;
}) {
  return (
    <View style={styles.fieldCard}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <PrivacyToggle visibility={visibility} onChange={onChangeVisibility} />
      </View>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Add your answer…'}
        placeholderTextColor={colors.neutralSubtle}
        multiline={multiline}
      />
    </View>
  );
}

// ── List editor: add / remove free-form entries, with privacy ─────────────────

export function ListFieldEditor({
  label,
  values,
  visibility,
  onChangeValues,
  onChangeVisibility,
}: {
  label: string;
  values: string[];
  visibility: FieldVisibility;
  onChangeValues: (next: string[]) => void;
  onChangeVisibility: (v: FieldVisibility) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChangeValues([...values, trimmed]);
    setDraft('');
  };

  const removeAt = (index: number) => {
    onChangeValues(values.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.fieldCard}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <PrivacyToggle visibility={visibility} onChange={onChangeVisibility} />
      </View>

      {values.length > 0 ? (
        <View style={styles.chipWrap}>
          {values.map((v, i) => (
            <Pressable
              key={`${v}-${i}`}
              style={styles.entryChip}
              onPress={() => removeAt(i)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${v}`}
              hitSlop={6}
            >
              <Text style={styles.entryChipText}>{v}</Text>
              <Text style={styles.entryChipRemove}>×</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, styles.addInput]}
          value={draft}
          onChangeText={setDraft}
          placeholder="Add an item…"
          placeholderTextColor={colors.neutralSubtle}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <Pressable
          onPress={add}
          style={styles.addButton}
          accessibilityRole="button"
          accessibilityLabel={`Add to ${label}`}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Read-only "value row" for the partner view ────────────────────────────────

export function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readRow}>
      <Text style={styles.readLabel}>{label}</Text>
      <Text style={styles.readValue}>{value}</Text>
    </View>
  );
}

export function ReadOnlyList({ label, values }: { label: string; values: string[] }) {
  return (
    <View style={styles.readRow}>
      <Text style={styles.readLabel}>{label}</Text>
      <View style={styles.chipWrap}>
        {values.map((v, i) => (
          <View key={`${v}-${i}`} style={styles.readChip}>
            <Text style={styles.readChipText}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** "They haven't shared this yet." placeholder for an empty partner section. */
export function EmptyShareNote() {
  return <Text style={styles.emptyNote}>They haven’t shared this yet.</Text>;
}

const styles = StyleSheet.create({
  fieldCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  fieldLabel: { ...typography.bodyMedium, color: colors.neutral, flex: 1, fontSize: 15 },
  input: {
    ...typography.bodySm,
    color: colors.neutral,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 76, textAlignVertical: 'top' },

  privacyPill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  privacyShared: { backgroundColor: 'rgba(197,163,101,0.14)', borderColor: colors.gold },
  privacyPrivate: { backgroundColor: colors.background, borderColor: colors.border },
  privacyText: { ...typography.label, fontSize: 11 },
  privacyTextShared: { color: colors.gold },
  privacyTextPrivate: { color: colors.neutralMuted },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  entryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(197,163,101,0.12)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  entryChipText: { ...typography.bodySm, color: colors.neutral, fontSize: 14 },
  entryChipRemove: { color: colors.gold, fontSize: 16, lineHeight: 16 },

  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addInput: { flex: 1 },
  addButton: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  addButtonText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 14 },

  readRow: { marginBottom: spacing.md },
  readLabel: { ...typography.label, color: colors.gold, marginBottom: 4 },
  readValue: { ...typography.bodySm, color: colors.neutral, fontSize: 15, lineHeight: 21 },
  readChip: {
    backgroundColor: 'rgba(197,163,101,0.1)',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  readChipText: { ...typography.bodySm, color: colors.neutral, fontSize: 13 },

  emptyNote: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    fontStyle: 'italic',
    fontSize: 14,
  },
});
