/**
 * Small reusable presentational primitives shared across the splitting flow:
 * pill CTA buttons, selectable chips, choice cards, step progress, section
 * eyebrow labels, and an info/note callout. Styling follows the app's
 * dark-green sanctuary + gold design tokens.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, Animated, Image } from 'react-native';
import { colors, spacing, typography } from '../../../shared/theme';
import { usePressAnimation } from '../../../shared/hooks';
import { ArrowRightIcon, CheckIcon } from './SplittingIcons';

// ─── Primary pill CTA ───────────────────────────────────────────────────────

export function PrimaryButton({
  label,
  onPress,
  disabled,
  withArrow,
  icon,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  withArrow?: boolean;
  icon?: React.ReactNode;
}) {
  const { scaleValue, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }]}>
      <Pressable
        style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}
        onPress={disabled ? undefined : onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
        android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
      >
        {icon ? <View style={styles.btnIcon}>{icon}</View> : null}
        <Text style={styles.primaryBtnText}>{label}</Text>
        {withArrow ? <ArrowRightIcon color={colors.ctaText} size={18} /> : null}
      </Pressable>
    </Animated.View>
  );
}

// ─── Secondary (outlined) pill ──────────────────────────────────────────────

export function SecondaryButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
}) {
  const { scaleValue, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }]}>
      <Pressable
        style={styles.secondaryBtn}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
        android_ripple={{ color: 'rgba(139,111,58,0.1)' }}
      >
        {icon ? <View style={styles.btnIcon}>{icon}</View> : null}
        <Text style={styles.secondaryBtnText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Text-only tertiary link ────────────────────────────────────────────────

export function TextButton({ label, onPress }: { label: string; onPress?: () => void }) {
  const { scaleValue, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.textBtn}
      >
        <Text style={styles.textBtnLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Selectable chip (multi-select trigger) ─────────────────────────────────

export function SelectChip({
  label,
  selected,
  onPress,
  onLongPress,
  icon,
  accessibilityHint,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Optional secondary gesture, e.g. removing a person's own custom chip. */
  onLongPress?: () => void;
  icon?: React.ReactNode;
  accessibilityHint?: string;
}) {
  const { scaleValue, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }]}>
      <Pressable
        style={[styles.chip, selected && styles.chipSelected]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        android_ripple={{ color: 'rgba(139,111,58,0.12)' }}
      >
        {icon ? <View style={styles.chipIcon}>{icon}</View> : null}
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
        {selected ? (
          <View style={styles.chipCheck}>
            <CheckIcon color={colors.ctaText} size={11} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

// ─── Section eyebrow with optional hint on the right ────────────────────────

export function SectionLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
  );
}

// ─── Choice card (single-select, radio-style) ───────────────────────────────

export function ChoiceCard({
  title,
  tag,
  description,
  icon,
  selected,
  suggested,
  onPress,
}: {
  title: string;
  tag?: string;
  description?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  suggested?: boolean;
  onPress?: () => void;
}) {
  const { scaleValue, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }]}>
      <Pressable
        style={[styles.choiceCard, selected && styles.choiceCardSelected]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityState={{ selected: !!selected }}
        accessibilityLabel={title}
        android_ripple={{ color: 'rgba(139,111,58,0.08)' }}
      >
        {icon ? <View style={styles.choiceIcon}>{icon}</View> : null}
        <View style={{ flex: 1 }}>
          <View style={styles.choiceTitleRow}>
            <Text style={styles.choiceTitle}>{title}</Text>
            {suggested ? (
              <View style={styles.suggestedPill}>
                <Text style={styles.suggestedText}>Suggested</Text>
              </View>
            ) : null}
          </View>
          {tag ? (
            <View style={styles.choiceTagPill}>
              <Text style={styles.choiceTagText}>{tag}</Text>
            </View>
          ) : null}
          {description ? <Text style={styles.choiceDesc}>{description}</Text> : null}
        </View>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Step progress dots ─────────────────────────────────────────────────────

export function StepProgress({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressBar,
            i < current && styles.progressBarDone,
            i === current && styles.progressBarActive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Soft note / callout card ───────────────────────────────────────────────

export function NoteCallout({
  children,
  icon,
  style,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.note, style]}>
      {icon ? <View style={styles.noteIcon}>{icon}</View> : null}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

// ─── Status pill (e.g. "SAFE SPACE PROTOCOL ACTIVE") ────────────────────────

export function StatusPill({ label }: { label: string }) {
  return (
    <View style={styles.statusPill}>
      <View style={styles.statusDot} />
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.ctaBackground,
    height: 56,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    // 3D beveled border
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderTopColor: 'rgba(139,111,58,1)',
    borderLeftColor: 'rgba(139,111,58,0.9)',
    borderRightColor: 'rgba(107,86,44,1)',
    borderBottomColor: 'rgba(107,86,44,1.2)',
    shadowColor: 'rgba(139,111,58,0.8)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 16 },
  btnIcon: { alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(6,78,59,0.35)',
    // 3D beveled border (secondary style)
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderTopColor: 'rgba(139,111,58,1)',
    borderLeftColor: 'rgba(139,111,58,0.9)',
    borderRightColor: 'rgba(107,86,44,1)',
    borderBottomColor: 'rgba(107,86,44,1.2)',
  },
  secondaryBtnText: { ...typography.bodyMedium, color: colors.primaryLight, fontSize: 15 },
  textBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  textBtnLabel: { ...typography.bodyMedium, color: colors.neutralMuted, fontSize: 15 },

  // chips
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 24,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: 'rgba(6,78,59,0.55)', borderColor: colors.gold },
  chipIcon: { width: 16, alignItems: 'center' },
  chipText: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 14 },
  chipTextSelected: { color: colors.neutral },
  chipCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // section labels
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionLabel: { ...typography.label, color: colors.gold },
  sectionHint: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11 },

  // choice cards
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 12,
  },
  choiceCardSelected: { borderColor: colors.gold, backgroundColor: 'rgba(6,78,59,0.4)' },
  choiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139,111,58,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  choiceTitle: { ...typography.headlineSm, color: colors.neutral, fontSize: 20 },
  choiceTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139,111,58,0.14)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  choiceTagText: { ...typography.label, color: colors.gold, fontSize: 10 },
  choiceDesc: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 8, lineHeight: 19 },
  suggestedPill: {
    backgroundColor: 'rgba(139,111,58,0.18)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  suggestedText: { ...typography.label, color: colors.gold, fontSize: 9 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioSelected: { borderColor: colors.gold },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.gold },

  // progress
  progressRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressBarDone: { backgroundColor: colors.rhythmComplete },
  progressBarActive: { backgroundColor: colors.gold },

  // note callout
  note: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  noteIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(6,78,59,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // status pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  statusText: { ...typography.label, color: colors.gold, fontSize: 10 },
});
