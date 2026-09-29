/**
 * PartnerSupportProfileScreen — read-only view of the linked partner's shared
 * Support Profile. The user cannot edit anything here. Only sections with shared
 * content are rendered; empty sections show "They haven't shared this yet."
 *
 * The data arrives already filtered by the server (private/empty fields are
 * physically absent), so this screen never sees, and therefore cannot leak,
 * anything the partner didn't share.
 *
 * `focusSection` (from a contextual entry point) scrolls straight to a section
 * but the whole shared profile is still available.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { NoteCallout } from '../../splitting/components/SplittingPrimitives';
import {
  ReadOnlyRow,
  ReadOnlyList,
  EmptyShareNote,
} from '../components/SupportProfilePrimitives';
import type { SupportProfileStackParamList } from '../../../navigation/SupportProfileStackParamList';
import { usePartnerSupportProfile } from '../hooks/useSupportProfile';
import {
  FAVORITES_FIELDS,
  HOW_TO_HELP_ME_FIELDS,
  LITTLE_THINGS_FIELDS,
  WHO_I_AM_FIELDS,
  WHAT_I_LIKE_FIELDS,
  THINGS_TO_KNOW_FIELDS,
  boundaryCategoryLabel,
  supportOptionLabel,
} from '../constants';
import type { PartnerSupportProfile, SectionKey } from '../types/supportProfile.types';

type Route = RouteProp<SupportProfileStackParamList, 'PartnerSupportProfile'>;

/** A section shell that renders the empty note when nothing is shared. */
function Section({
  title,
  hasContent,
  onLayout,
  children,
}: {
  title: string;
  hasContent: boolean;
  onLayout?: (y: number) => void;
  children: React.ReactNode;
}) {
  return (
    <View
      style={styles.sectionCard}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}
    >
      <Text style={styles.sectionTitle}>{title}</Text>
      {hasContent ? children : <EmptyShareNote />}
    </View>
  );
}

export function PartnerSupportProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const focusSection = route.params?.focusSection;
  const { profile, loading, error, refresh } = usePartnerSupportProfile();

  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Partial<Record<SectionKey, number>>>({});

  // Once loaded, scroll to the focused section if one was requested.
  useEffect(() => {
    if (!profile || !focusSection) return;
    const y = positions.current[focusSection];
    if (typeof y === 'number') {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true }));
    }
  }, [profile, focusSection]);

  const partnerName = profile?.partnerName ?? 'Your partner';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title={profile ? `${partnerName}'s Handbook` : 'Partner Handbook'}
        onBack={() => navigation.goBack()}
      />

      {loading && !profile ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : !profile ? (
        <View style={styles.centered}>
          <Text style={styles.emptyState}>
            {error ?? 'Link with your partner to see their handbook.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.gold} />
          }
        >
          <NoteCallout>
            <Text style={styles.introNote}>
              This is only what {partnerName} chose to share. It’s a gentle guide — not a
              script. Amori won’t act on it for you.
            </Text>
          </NoteCallout>

          {renderSections(profile, partnerName, positions.current)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function renderSections(
  profile: PartnerSupportProfile,
  partnerName: string,
  positions: Partial<Record<SectionKey, number>>,
) {
  const who = profile.whoIAm;
  const like = profile.whatILike;
  const fav = profile.favorites;
  const help = profile.howToHelpMe;
  const know = profile.thingsToKnow;
  const bounds = profile.boundaries;
  const little = profile.littleThings;

  const textRows = (
    obj: Record<string, unknown>,
    fields: { key: string; label: string }[],
  ) =>
    fields
      .map((f) => ({ label: f.label, value: obj[f.key] as string | null | undefined }))
      .filter((r) => typeof r.value === 'string' && r.value.trim())
      .map((r) => <ReadOnlyRow key={r.label} label={r.label} value={r.value as string} />);

  const listRows = (
    obj: Record<string, unknown>,
    fields: { key: string; label: string }[],
  ) =>
    fields
      .map((f) => ({ label: f.label, values: obj[f.key] as string[] | null | undefined }))
      .filter((r) => Array.isArray(r.values) && r.values.length > 0)
      .map((r) => <ReadOnlyList key={r.label} label={r.label} values={r.values as string[]} />);

  return (
    <>
      <Section title="How to Help Me" hasContent={help.hasSharedContent} onLayout={(y) => (positions.howToHelpMe = y)}>
        {textRows(help as never, HOW_TO_HELP_ME_FIELDS)}
        {help.supportOptions && help.supportOptions.length > 0 ? (
          <ReadOnlyList
            label={`When ${partnerName} feels overwhelmed`}
            values={help.supportOptions.map(supportOptionLabel)}
          />
        ) : null}
        {help.customOptions && help.customOptions.length > 0 ? (
          <ReadOnlyList label="In their words" values={help.customOptions} />
        ) : null}
      </Section>

      <Section title="Who I Am" hasContent={who.hasSharedContent} onLayout={(y) => (positions.whoIAm = y)}>
        {textRows(who as never, WHO_I_AM_FIELDS)}
      </Section>

      <Section title="What I Like" hasContent={like.hasSharedContent} onLayout={(y) => (positions.whatILike = y)}>
        {listRows(like as never, WHAT_I_LIKE_FIELDS)}
      </Section>

      <Section title="My Favorites" hasContent={fav.hasSharedContent} onLayout={(y) => (positions.favorites = y)}>
        {FAVORITES_FIELDS.map((f) => {
          const value = (fav as never)[f.key] as string | null | undefined;
          return typeof value === 'string' && value.trim() ? (
            <ReadOnlyRow key={f.key} label={f.label} value={value} />
          ) : null;
        })}
      </Section>

      <Section title="Things to Know" hasContent={know.hasSharedContent} onLayout={(y) => (positions.thingsToKnow = y)}>
        {listRows(know as never, THINGS_TO_KNOW_FIELDS)}
      </Section>

      <Section title="My Boundaries" hasContent={bounds.hasSharedContent} onLayout={(y) => (positions.boundaries = y)}>
        {bounds.categories.map((c) => (
          <View key={c.category} style={styles.boundaryBlock}>
            <Text style={styles.boundaryTitle}>{boundaryCategoryLabel(c.category)}</Text>
            {c.comfortableWith.length > 0 ? (
              <ReadOnlyList label="Comfortable with" values={c.comfortableWith} />
            ) : null}
            {c.askBefore.length > 0 ? <ReadOnlyList label="Ask before" values={c.askBefore} /> : null}
            {c.pleaseDont.length > 0 ? <ReadOnlyList label="Please don't" values={c.pleaseDont} /> : null}
          </View>
        ))}
      </Section>

      <Section title="My Little Things" hasContent={little.hasSharedContent} onLayout={(y) => (positions.littleThings = y)}>
        {textRows(little as never, LITTLE_THINGS_FIELDS)}
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  emptyState: { ...typography.bodyMedium, color: colors.neutralMuted, textAlign: 'center' },
  introNote: { ...typography.bodySm, color: colors.neutralMuted, lineHeight: 20 },

  sectionCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: { ...typography.headlineSm, color: colors.neutral, fontSize: 18, marginBottom: spacing.sm },
  boundaryBlock: { marginBottom: spacing.md },
  boundaryTitle: { ...typography.bodyMedium, color: colors.neutral, marginBottom: 6 },
});
