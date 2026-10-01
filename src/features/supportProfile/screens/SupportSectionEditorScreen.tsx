/**
 * SupportSectionEditorScreen — edit ONE section of the owner's Support Profile.
 *
 * Loads the current section from the cached own-profile, keeps a local draft,
 * and PATCHes just that section on save (partial update — untouched fields are
 * left alone server-side). Each field has its own Shared/Private toggle.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { PrimaryButton, SelectChip, SectionLabel } from '../../splitting/components/SplittingPrimitives';
import {
  TextFieldEditor,
  ListFieldEditor,
  PrivacyToggle,
} from '../components/SupportProfilePrimitives';
import type { SupportProfileStackParamList } from '../../../navigation/SupportProfileStackParamList';
import {
  SECTIONS,
  WHO_I_AM_FIELDS,
  WHAT_I_LIKE_FIELDS,
  FAVORITES_FIELDS,
  HOW_TO_HELP_ME_FIELDS,
  THINGS_TO_KNOW_FIELDS,
  LITTLE_THINGS_FIELDS,
  SUPPORT_OPTIONS,
  BOUNDARY_CATEGORIES,
} from '../constants';
import { ApiError } from '../../../services/api/client';
import { supportProfileService } from '../services/supportProfileService';
import { supportProfileStore } from '../services/supportProfileStore';
import { useOwnSupportProfile } from '../hooks/useSupportProfile';
import type {
  FieldVisibility,
  SupportPreferenceOption,
  BoundaryCategory,
  TextField,
  ListField,
} from '../types/supportProfile.types';

type Route = RouteProp<SupportProfileStackParamList, 'SupportSectionEditor'>;

const EMPTY_TEXT: TextField = { value: '', visibility: 'Shared' };
const EMPTY_LIST: ListField = { values: [], visibility: 'Shared' };

export function SupportSectionEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { section } = route.params;
  const { profile } = useOwnSupportProfile();

  const meta = SECTIONS.find((s) => s.key === section)!;

  // Local editable draft, seeded from the cached profile section.
  const [text, setText] = useState<Record<string, TextField>>({});
  const [list, setList] = useState<Record<string, ListField>>({});
  const [colorHex, setColorHex] = useState<string>('');
  const [supportOptions, setSupportOptions] = useState<SupportPreferenceOption[]>([]);
  const [customOptions, setCustomOptions] = useState<string[]>([]);
  const [optionsVisibility, setOptionsVisibility] = useState<FieldVisibility>('Shared');
  const [boundaries, setBoundaries] = useState<
    Record<string, { comfortableWith: ListField; askBefore: ListField; pleaseDont: ListField; visibility: FieldVisibility }>
  >({});
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Seed the draft once the profile is available. The profile loads async, so
  // it starts null and arrives on a later render — a useEffect (not useMemo)
  // is the correct place to derive local editable state from it, and it seeds
  // exactly once (guarded by `seeded`).
  useEffect(() => {
    if (!profile || seeded) return;
    const t: Record<string, TextField> = {};
    const l: Record<string, ListField> = {};

    const asText = (obj: Record<string, unknown>, key: string): TextField => {
      const v = obj[key] as TextField | undefined;
      return v ? { ...v } : { ...EMPTY_TEXT };
    };
    const asList = (obj: Record<string, unknown>, key: string): ListField => {
      const v = obj[key] as ListField | undefined;
      return v ? { ...v } : { ...EMPTY_LIST };
    };

    if (section === 'whoIAm') {
      WHO_I_AM_FIELDS.forEach((f) => (t[f.key] = asText(profile.whoIAm as never, f.key)));
    } else if (section === 'favorites') {
      FAVORITES_FIELDS.forEach((f) => (t[f.key] = asText(profile.favorites as never, f.key)));
      setColorHex(profile.favorites.favoriteColorHex ?? '');
    } else if (section === 'howToHelpMe') {
      HOW_TO_HELP_ME_FIELDS.forEach((f) => (t[f.key] = asText(profile.howToHelpMe as never, f.key)));
      setSupportOptions([...profile.howToHelpMe.supportOptions]);
      setCustomOptions([...profile.howToHelpMe.customOptions]);
      setOptionsVisibility(profile.howToHelpMe.optionsVisibility);
    } else if (section === 'littleThings') {
      LITTLE_THINGS_FIELDS.forEach((f) => (t[f.key] = asText(profile.littleThings as never, f.key)));
    } else if (section === 'whatILike') {
      WHAT_I_LIKE_FIELDS.forEach((f) => (l[f.key] = asList(profile.whatILike as never, f.key)));
    } else if (section === 'thingsToKnow') {
      THINGS_TO_KNOW_FIELDS.forEach((f) => (l[f.key] = asList(profile.thingsToKnow as never, f.key)));
    } else if (section === 'boundaries') {
      const b: typeof boundaries = {};
      BOUNDARY_CATEGORIES.forEach((c) => {
        const existing = profile.boundaries.categories.find((x) => x.category === c.id);
        b[c.id] = {
          comfortableWith: { values: existing?.comfortableWith ?? [], visibility: existing?.visibility ?? 'Shared' },
          askBefore: { values: existing?.askBefore ?? [], visibility: existing?.visibility ?? 'Shared' },
          pleaseDont: { values: existing?.pleaseDont ?? [], visibility: existing?.visibility ?? 'Shared' },
          visibility: existing?.visibility ?? 'Shared',
        };
      });
      setBoundaries(b);
    }

    setText(t);
    setList(l);
    setSeeded(true);
  }, [profile, seeded, section]);

  const updateText = (key: string, patch: Partial<TextField>) =>
    setText((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY_TEXT), ...patch } }));
  const updateList = (key: string, patch: Partial<ListField>) =>
    setList((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY_LIST), ...patch } }));

  const toggleSupportOption = (id: SupportPreferenceOption) =>
    setSupportOptions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = useCallback(async () => {
    setSaving(true);
    try {
      let updated;
      if (section === 'whoIAm') {
        const body: Record<string, { value?: string; visibility?: FieldVisibility }> = {};
        WHO_I_AM_FIELDS.forEach((f) => {
          body[f.key] = { value: text[f.key]?.value ?? '', visibility: text[f.key]?.visibility };
        });
        updated = await supportProfileService.updateWhoIAm(body);
      } else if (section === 'favorites') {
        const body: Record<string, unknown> = { favoriteColorHex: { value: colorHex } };
        FAVORITES_FIELDS.forEach((f) => {
          body[f.key] = { value: text[f.key]?.value ?? '', visibility: text[f.key]?.visibility };
        });
        updated = await supportProfileService.updateFavorites(body);
      } else if (section === 'howToHelpMe') {
        const body: Record<string, unknown> = {
          supportOptions,
          customOptions,
          optionsVisibility,
        };
        HOW_TO_HELP_ME_FIELDS.forEach((f) => {
          body[f.key] = { value: text[f.key]?.value ?? '', visibility: text[f.key]?.visibility };
        });
        updated = await supportProfileService.updateHowToHelpMe(body);
      } else if (section === 'littleThings') {
        const body: Record<string, { value?: string; visibility?: FieldVisibility }> = {};
        LITTLE_THINGS_FIELDS.forEach((f) => {
          body[f.key] = { value: text[f.key]?.value ?? '', visibility: text[f.key]?.visibility };
        });
        updated = await supportProfileService.updateLittleThings(body);
      } else if (section === 'whatILike') {
        const body: Record<string, { values?: string[]; visibility?: FieldVisibility }> = {};
        WHAT_I_LIKE_FIELDS.forEach((f) => {
          body[f.key] = { values: list[f.key]?.values ?? [], visibility: list[f.key]?.visibility };
        });
        updated = await supportProfileService.updateWhatILike(body);
      } else if (section === 'thingsToKnow') {
        const body: Record<string, { values?: string[]; visibility?: FieldVisibility }> = {};
        THINGS_TO_KNOW_FIELDS.forEach((f) => {
          body[f.key] = { values: list[f.key]?.values ?? [], visibility: list[f.key]?.visibility };
        });
        updated = await supportProfileService.updateThingsToKnow(body);
      } else if (section === 'boundaries') {
        const categories = BOUNDARY_CATEGORIES.map((c) => ({
          category: c.id as BoundaryCategory,
          comfortableWith: boundaries[c.id]?.comfortableWith.values ?? [],
          askBefore: boundaries[c.id]?.askBefore.values ?? [],
          pleaseDont: boundaries[c.id]?.pleaseDont.values ?? [],
          visibility: boundaries[c.id]?.visibility,
        }));
        updated = await supportProfileService.updateBoundaries({ categories });
      }

      if (updated) supportProfileStore.setOwn(updated);
      navigation.goBack();
    } catch (err) {
      // Surface a clearer reason. A 404/501 means the server doesn't have this
      // feature yet (backend not deployed) — distinct from a real connection
      // problem — so we don't tell the user to "check your connection" wrongly.
      const status = err instanceof ApiError ? err.status : null;
      const message =
        status === 404 || status === 501
          ? 'This feature isn’t available on the server yet. Please try again after the next update.'
          : status != null
            ? `Couldn’t save (server error ${status}). Please try again.`
            : 'Please check your connection and try again.';
      Alert.alert('Could not save', message);
    } finally {
      setSaving(false);
    }
  }, [section, text, list, colorHex, supportOptions, customOptions, optionsVisibility, boundaries, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title={meta.title} subtitle="Edit preference" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.blurb}>{meta.blurb}</Text>

        {section === 'whoIAm' &&
          WHO_I_AM_FIELDS.map((f) => (
            <TextFieldEditor
              key={f.key}
              label={f.label}
              value={text[f.key]?.value ?? ''}
              visibility={text[f.key]?.visibility ?? 'Shared'}
              multiline={f.key !== 'nickname'}
              onChangeText={(v) => updateText(f.key, { value: v })}
              onChangeVisibility={(v) => updateText(f.key, { visibility: v })}
            />
          ))}

        {section === 'favorites' && (
          <>
            {FAVORITES_FIELDS.map((f) => (
              <TextFieldEditor
                key={f.key}
                label={f.label}
                value={text[f.key]?.value ?? ''}
                visibility={text[f.key]?.visibility ?? 'Shared'}
                onChangeText={(v) => updateText(f.key, { value: v })}
                onChangeVisibility={(v) => updateText(f.key, { visibility: v })}
              />
            ))}
            <TextFieldEditor
              label="Favourite colour — hex (optional)"
              value={colorHex}
              visibility={text.favoriteColor?.visibility ?? 'Shared'}
              placeholder="#DFBA73"
              onChangeText={setColorHex}
              onChangeVisibility={(v) => updateText('favoriteColor', { visibility: v })}
            />
          </>
        )}

        {section === 'howToHelpMe' && (
          <>
            {HOW_TO_HELP_ME_FIELDS.map((f) => (
              <TextFieldEditor
                key={f.key}
                label={f.label}
                value={text[f.key]?.value ?? ''}
                visibility={text[f.key]?.visibility ?? 'Shared'}
                multiline
                onChangeText={(v) => updateText(f.key, { value: v })}
                onChangeVisibility={(v) => updateText(f.key, { visibility: v })}
              />
            ))}
            <View style={styles.optionsHeader}>
              <SectionLabel label="When I'm having a difficult day, I usually want…" />
              <PrivacyToggle visibility={optionsVisibility} onChange={setOptionsVisibility} />
            </View>
            <View style={styles.chipRow}>
              {SUPPORT_OPTIONS.map((o) => (
                <SelectChip
                  key={o.id}
                  label={o.label}
                  selected={supportOptions.includes(o.id)}
                  onPress={() => toggleSupportOption(o.id)}
                />
              ))}
            </View>
            <ListFieldEditor
              label="Custom (your own words)"
              values={customOptions}
              visibility={optionsVisibility}
              onChangeValues={setCustomOptions}
              onChangeVisibility={setOptionsVisibility}
            />
          </>
        )}

        {section === 'littleThings' &&
          LITTLE_THINGS_FIELDS.map((f) => (
            <TextFieldEditor
              key={f.key}
              label={f.label}
              value={text[f.key]?.value ?? ''}
              visibility={text[f.key]?.visibility ?? 'Shared'}
              onChangeText={(v) => updateText(f.key, { value: v })}
              onChangeVisibility={(v) => updateText(f.key, { visibility: v })}
            />
          ))}

        {section === 'whatILike' &&
          WHAT_I_LIKE_FIELDS.map((f) => (
            <ListFieldEditor
              key={f.key}
              label={f.label}
              values={list[f.key]?.values ?? []}
              visibility={list[f.key]?.visibility ?? 'Shared'}
              onChangeValues={(v) => updateList(f.key, { values: v })}
              onChangeVisibility={(v) => updateList(f.key, { visibility: v })}
            />
          ))}

        {section === 'thingsToKnow' &&
          THINGS_TO_KNOW_FIELDS.map((f) => (
            <ListFieldEditor
              key={f.key}
              label={f.label}
              values={list[f.key]?.values ?? []}
              visibility={list[f.key]?.visibility ?? 'Shared'}
              onChangeValues={(v) => updateList(f.key, { values: v })}
              onChangeVisibility={(v) => updateList(f.key, { visibility: v })}
            />
          ))}

        {section === 'boundaries' &&
          BOUNDARY_CATEGORIES.map((c) => {
            const b = boundaries[c.id];
            if (!b) return null;
            return (
              <View key={c.id} style={styles.boundaryCard}>
                <View style={styles.optionsHeader}>
                  <SectionLabel label={c.label} />
                  <PrivacyToggle
                    visibility={b.visibility}
                    onChange={(v) =>
                      setBoundaries((prev) => ({ ...prev, [c.id]: { ...prev[c.id], visibility: v } }))
                    }
                  />
                </View>
                <ListFieldEditor
                  label="I'm comfortable with"
                  values={b.comfortableWith.values}
                  visibility={b.visibility}
                  onChangeValues={(v) =>
                    setBoundaries((prev) => ({
                      ...prev,
                      [c.id]: { ...prev[c.id], comfortableWith: { ...prev[c.id].comfortableWith, values: v } },
                    }))
                  }
                  onChangeVisibility={(v) =>
                    setBoundaries((prev) => ({ ...prev, [c.id]: { ...prev[c.id], visibility: v } }))
                  }
                />
                <ListFieldEditor
                  label="Please ask me before"
                  values={b.askBefore.values}
                  visibility={b.visibility}
                  onChangeValues={(v) =>
                    setBoundaries((prev) => ({
                      ...prev,
                      [c.id]: { ...prev[c.id], askBefore: { ...prev[c.id].askBefore, values: v } },
                    }))
                  }
                  onChangeVisibility={(v) =>
                    setBoundaries((prev) => ({ ...prev, [c.id]: { ...prev[c.id], visibility: v } }))
                  }
                />
                <ListFieldEditor
                  label="Please don't"
                  values={b.pleaseDont.values}
                  visibility={b.visibility}
                  onChangeValues={(v) =>
                    setBoundaries((prev) => ({
                      ...prev,
                      [c.id]: { ...prev[c.id], pleaseDont: { ...prev[c.id].pleaseDont, values: v } },
                    }))
                  }
                  onChangeVisibility={(v) =>
                    setBoundaries((prev) => ({ ...prev, [c.id]: { ...prev[c.id], visibility: v } }))
                  }
                />
              </View>
            );
          })}

        <View style={styles.saveWrap}>
          <PrimaryButton label={saving ? 'Saving…' : 'Save'} onPress={save} disabled={saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  blurb: { ...typography.bodySm, color: colors.neutralMuted, marginBottom: spacing.md, lineHeight: 20 },
  optionsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  boundaryCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  saveWrap: { marginTop: spacing.md },
});
