/**
 * ItemComposeForm — the "photo, title, description, link" form shared by the
 * Wishlist and Date Ideas add/edit screens (the same shape as adding to the
 * Vision Board).
 *
 * It owns the screen chrome, the photo pick + upload (see useImageAttachment),
 * validation and the double-tap guard. The parent screen decides what saving
 * means: it receives clean values in `onSubmit`, calls its own API, shows its
 * own success message and navigates away. If `onSubmit` throws, the form stays
 * open with the draft intact, shows the error inline and raises the failure
 * overlay so the user can retry.
 *
 * Only the title is required. A photo that is still uploading, or whose upload
 * failed, blocks saving until it is retried or removed, so a photo is never
 * silently dropped.
 *
 * A screen can add its own fields between the description and the link through
 * `extraFields` (it owns their state) and block a bad save with `validate`.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import { KeyboardDoneAccessory } from '../../../shared/components/inputs';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import { useImageAttachment } from '../hooks/useImageAttachment';
import { normalizeLink } from '../utils/links';
import { FormField, FormLabel } from './FormField';

/** What the parent gets on save. All text is trimmed. */
export interface ItemFormValues {
  title: string;
  /** '' when empty. */
  description: string;
  /** A normalized http(s) URL, or null when the link is empty. */
  link: string | null;
  /** The uploaded photo's file key, or null when there is no photo. */
  imageKey: string | null;
}

export interface ItemFormInitial {
  title?: string | null;
  description?: string | null;
  link?: string | null;
  /** An already-uploaded photo (edit mode). */
  image?: { fileKey: string; url: string } | null;
}

interface ItemComposeFormProps {
  headerTitle: string;
  saveLabel: string;
  saveAccessibilityLabel: string;
  /** What the thing is called in messages, e.g. "wish" or "date idea". */
  noun: string;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  linkPlaceholder: string;
  /** Names uploads when the picker gives no file name. */
  filePrefix: string;
  /** Overlay text shown when saving fails. */
  failureOverlay: string;
  initial?: ItemFormInitial;
  /**
   * Extra fields a screen wants between the description and the link (see
   * FormField / FormLabel). The screen owns their state and reads it in
   * `onSubmit` and `validate`.
   */
  extraFields?: React.ReactNode;
  /** Runs before saving; return a message to block the save, or null to allow it. */
  validate?: () => string | null;
  /** Save the values. Throw to keep the form open and show the error. */
  onSubmit: (values: ItemFormValues) => Promise<void>;
  onBack: () => void;
}

// Match the backend column limits (title 200, description 2000, link 2048).
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 2000;
const MAX_LINK = 2048;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function ItemComposeForm({
  headerTitle,
  saveLabel,
  saveAccessibilityLabel,
  noun,
  titleLabel,
  titlePlaceholder,
  descriptionPlaceholder,
  linkPlaceholder,
  filePrefix,
  failureOverlay,
  initial,
  extraFields,
  validate,
  onSubmit,
  onBack,
}: ItemComposeFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [link, setLink] = useState(initial?.link ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { image, error: imageError, pickImage, retryImage, removeImage } = useImageAttachment(
    filePrefix,
    initial?.image ?? null,
  );
  const uploadingImage = image?.uploading ?? false;

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(`Give your ${noun} a title.`);
      return;
    }
    if (uploadingImage) {
      setError('Give the photo a moment to finish uploading.');
      return;
    }
    // A photo that failed to upload has no key; don't silently save without it.
    if (image?.failed) {
      setError('The photo did not upload. Retry it or remove it to continue.');
      return;
    }

    const trimmedLink = link.trim();
    const normalizedLink = normalizeLink(trimmedLink);
    if (trimmedLink && !normalizedLink) {
      setError("That link doesn't look right. Try something like example.com/page.");
      return;
    }

    const problem = validate?.() ?? null;
    if (problem) {
      setError(problem);
      return;
    }

    // Guard against duplicate submissions while a save is already in flight.
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      await onSubmit({
        title: trimmedTitle,
        description: description.trim(),
        link: normalizedLink,
        imageKey: image?.fileKey ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not save the ${noun}. Please try again.`);
      showErrorOverlay(failureOverlay);
      // Stay on the screen with the draft intact so the user can retry.
    } finally {
      setSaving(false);
    }
  }, [
    title,
    description,
    link,
    image,
    uploadingImage,
    saving,
    noun,
    failureOverlay,
    validate,
    onSubmit,
  ]);

  const previewUri = useMemo(() => (image ? resolveMediaUrl(image.previewUri) : null), [image]);
  const shownError = error ?? imageError;
  const canSave = title.trim().length > 0 && !saving && !uploadingImage;
  const Noun = capitalize(noun);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title={headerTitle} onBack={onBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Image */}
          <FormLabel>PHOTO</FormLabel>
          {previewUri ? (
            <View style={styles.imageWrap}>
              <Image
                source={{ uri: previewUri }}
                style={styles.image}
                resizeMode="cover"
                accessibilityLabel={`Selected ${noun} photo`}
              />
              {image?.uploading ? (
                <View style={styles.imageOverlay}>
                  <ActivityIndicator color={colors.gold} />
                  <Text style={styles.overlayText}>Uploading…</Text>
                </View>
              ) : null}
              {image?.failed ? (
                <View style={styles.imageOverlay}>
                  <Text style={styles.overlayText}>{image.errorMessage ?? 'Upload failed'}</Text>
                  <Pressable
                    style={styles.retryChip}
                    onPress={retryImage}
                    accessibilityRole="button"
                    accessibilityLabel="Retry photo upload"
                  >
                    <Text style={styles.retryChipText}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}
              <Pressable
                style={styles.removeImageBtn}
                onPress={removeImage}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
              >
                <Text style={styles.removeImageText}>✕</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.imagePicker}
              onPress={pickImage}
              accessibilityRole="button"
              accessibilityLabel="Add a photo"
            >
              <Text style={styles.imagePickerText}>+ Add a photo</Text>
            </Pressable>
          )}

          <FormField
            label={titleLabel}
            placeholder={titlePlaceholder}
            value={title}
            onChangeText={setTitle}
            maxLength={MAX_TITLE}
            returnKeyType="next"
            accessibilityLabel={`${Noun} title`}
          />

          <FormField
            label="DESCRIPTION"
            placeholder={descriptionPlaceholder}
            value={description}
            onChangeText={setDescription}
            maxLength={MAX_DESCRIPTION}
            multiline
            accessibilityLabel={`${Noun} description`}
          />

          {extraFields}

          <FormField
            label="LINK"
            placeholder={linkPlaceholder}
            value={link}
            onChangeText={setLink}
            maxLength={MAX_LINK}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={`${Noun} link`}
          />

          {shownError ? <Text style={styles.errorText}>{shownError}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.saveBtn, (!canSave || pressed) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel={saveAccessibilityLabel}
          >
            {saving ? (
              <ActivityIndicator color={colors.ctaText} />
            ) : (
              <Text style={styles.saveBtnText}>{saveLabel}</Text>
            )}
          </Pressable>

          <View style={styles.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>

      <KeyboardDoneAccessory />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.md },

  imagePicker: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  imagePickerText: { ...typography.bodySemiBold, color: colors.gold },
  imageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  image: { width: '100%', height: 190 },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  overlayText: {
    ...typography.bodySm,
    color: colors.neutral,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  retryChip: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  retryChipText: { ...typography.bodySemiBold, color: colors.gold },
  removeImageBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: { color: colors.neutral, fontSize: 14 },

  errorText: { ...typography.bodySm, color: colors.emergency, marginTop: spacing.md },

  saveBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: spacing.lg,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 15 },

  bottomPad: { height: spacing.xl },
});
