/**
 * SupportPreferencesLink — a small contextual entry point that opens the
 * partner's Support Profile, optionally focused on one section.
 *
 * Used from Splitting, Date planning, and Let's Chat to offer a gentle,
 * on-demand peek at how the partner prefers to be supported/communicated with,
 * rather than surfacing the whole profile. It NEVER triggers a support action;
 * it only opens the read-only partner view. Renders nothing when there is no
 * linked partner.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import { colors, spacing, typography } from '../../../shared/theme';
import { partnerLinkService } from '../../profile/services/partnerLinkService';
import type { MainTabParamList } from '../../../navigation/types';
import type { SectionKey } from '../types/supportProfile.types';

type Props = {
  /** Copy for the link, e.g. "See how they prefer to be supported". */
  label: string;
  /** Which partner section to open straight to. */
  focusSection?: SectionKey;
  /** Optional one-line hint under the label. */
  hint?: string;
};

export function SupportPreferencesLink({ label, focusSection, hint }: Props) {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const [isLinked, setIsLinked] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    partnerLinkService
      .getStatus()
      .then((status) => {
        if (active) setIsLinked(status?.isLinked ?? false);
      })
      .catch(() => {
        if (active) setIsLinked(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Don't render for solo users — there's no partner profile to open.
  if (isLinked !== true) return null;

  const open = () =>
    navigation.navigate('SupportProfile', {
      screen: 'PartnerSupportProfile',
      params: { focusSection },
    });

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  textWrap: { flex: 1 },
  label: { ...typography.bodyMedium, color: colors.gold, fontSize: 15 },
  hint: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 2 },
  chevron: { color: colors.gold, fontSize: 24 },
});
