/**
 * AddVisionBoardItemScreen — compose a new "Us" Vision Board item, or edit an
 * existing one when `itemId` is passed.
 *
 * Image upload follows the standard two-step Amori flow: pick with
 * react-native-image-picker (capped at 2048px so full-size phone photos stay
 * under the backend limit), upload via mediaService.uploadImage to get a
 * fileKey, then attach that key to the item on save. If the upload fails the
 * text fields are preserved and the photo can be retried — a failed image never
 * loses the draft. Duplicate create requests are prevented while a save is in
 * flight.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  launchImageLibrary,
  type ImageLibraryOptions,
  type ImagePickerResponse,
  type MediaType,
} from 'react-native-image-picker';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import {
  DateTimeField,
  KeyboardDoneAccessory,
  KEYBOARD_DONE_ACCESSORY_ID,
  LocationPicker,
  parseIsoDate,
  type LocationValue,
} from '../../../shared/components/inputs';
import { mediaService } from '../../../services/media/mediaService';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { visionBoardService } from '../services/visionBoardService';
import {
  VISION_BOARD_ITEM_TYPE_LABELS,
  VISION_BOARD_ITEM_TYPE_ORDER,
  VISION_BOARD_ITEM_TYPE_VALUES,
  decodeVisionBoardItemType,
  type CreateVisionBoardItemRequest,
  type UpdateVisionBoardItemRequest,
  type VisionBoardItemType,
} from '../types/visionBoard.types';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'AddVisionBoardItem'>;
type Rt = RouteProp<TogetherStackParamList, 'AddVisionBoardItem'>;

/** The single hero image for an item, with its upload state. */
interface PickedImage {
  previewUri: string;
  fileType?: string;
  fileName?: string;
  /** Present once uploaded (or seeded from an existing item). */
  fileKey: string | null;
  uploading: boolean;
  failed: boolean;
  errorMessage?: string;
}

export function AddVisionBoardItemScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const editingId = route.params?.itemId ?? null;
  const presetSectionId = route.params?.sectionId ?? null;
  const isEditing = editingId != null;

  const [type, setType] = useState<VisionBoardItemType>('Dream');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [budget, setBudget] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<PickedImage | null>(null);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load the item when editing ──────────────────────────────────────────────
  useEffect(() => {
    if (!isEditing || !editingId) return;
    let cancelled = false;
    (async () => {
      try {
        const item = await visionBoardService.getItem(editingId);
        if (cancelled) return;
        setType(decodeVisionBoardItemType(item.type));
        setTitle(item.title);
        setDescription(item.description ?? '');
        setBudget(item.budget != null ? String(item.budget) : '');
        setExternalReference(item.externalReference ?? '');
        setNotes(item.notes ?? '');
        setTargetDate(parseIsoDate(item.targetDate) ?? (item.targetDate ? new Date(item.targetDate) : null));
        if (item.locationName || item.latitude != null) {
          setLocation({
            location: item.locationName ?? '',
            latitude: item.latitude,
            longitude: item.longitude,
          });
        }
        if (item.imageFileKey) {
          setImage({
            previewUri: resolveMediaUrl(item.imageUrl),
            fileKey: item.imageFileKey,
            uploading: false,
            failed: false,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load this item.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditing, editingId]);

  const uploadingImage = image?.uploading ?? false;

  // ── Image upload ──────────────────────────────────────────────────────────
  const uploadImage = useCallback(
    (file: { uri: string; type?: string; name?: string }) => {
      mediaService
        .uploadImage({
          uri: file.uri,
          type: file.type ?? 'image/jpeg',
          name: file.name ?? `vision-${Date.now()}.jpg`,
        })
        .then((uploaded) => {
          setImage((prev) =>
            prev && prev.previewUri === file.uri
              ? { ...prev, fileKey: uploaded.fileKey, uploading: false, failed: false, errorMessage: undefined }
              : prev,
          );
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Could not upload that photo.';
          setImage((prev) =>
            prev && prev.previewUri === file.uri
              ? { ...prev, uploading: false, failed: true, errorMessage: message }
              : prev,
          );
          // The draft text stays intact — only the photo failed.
          setError(message);
        });
    },
    [],
  );

  const pickImage = useCallback(() => {
    setError(null);
    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      // Cap the resolution so full-size phone photos stay well under the
      // backend's upload limit (a common cause of upload failures).
      maxWidth: 2048,
      maxHeight: 2048,
      includeBase64: false,
      selectionLimit: 1,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        setError('Could not access photos: ' + response.errorMessage);
        return;
      }
      const asset = (response.assets ?? []).find((a) => a.uri);
      if (!asset?.uri) return;

      const picked: PickedImage = {
        previewUri: asset.uri,
        fileType: asset.type,
        fileName: asset.fileName,
        fileKey: null,
        uploading: true,
        failed: false,
      };
      setImage(picked);
      uploadImage({ uri: picked.previewUri, type: picked.fileType, name: picked.fileName });
    });
  }, [uploadImage]);

  const retryImage = useCallback(() => {
    if (!image) return;
    setError(null);
    setImage({ ...image, uploading: true, failed: false, errorMessage: undefined });
    uploadImage({ uri: image.previewUri, type: image.fileType, name: image.fileName });
  }, [image, uploadImage]);

  const removeImage = useCallback(() => setImage(null), []);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (title.trim().length === 0) {
      setError('Give it a title.');
      return;
    }
    if (uploadingImage) {
      setError('Give the photo a moment to finish uploading.');
      return;
    }
    // Guard against duplicate submissions while a save is already in flight.
    if (saving) return;

    setSaving(true);
    setError(null);

    const parsedBudget = budget.trim() ? Number(budget.replace(/[^0-9.]/g, '')) : null;
    const budgetValue = parsedBudget != null && !Number.isNaN(parsedBudget) ? parsedBudget : null;
    const trimmedRef = externalReference.trim();
    const trimmedNotes = notes.trim();
    const trimmedDesc = description.trim();

    try {
      if (isEditing && editingId) {
        const payload: UpdateVisionBoardItemRequest = {
          title: title.trim(),
          description: trimmedDesc ? trimmedDesc : null,
          type: VISION_BOARD_ITEM_TYPE_VALUES[type],
          imageFileKey: image?.fileKey ?? '',
          locationName: location?.location ? location.location : null,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          targetDate: targetDate ? targetDate.toISOString() : null,
          budget: budgetValue,
          externalReference: trimmedRef ? trimmedRef : null,
          notes: trimmedNotes ? trimmedNotes : null,
        };
        await visionBoardService.updateItem(editingId, payload);
        showSuccessOverlay('Vision saved');
      } else {
        const payload: CreateVisionBoardItemRequest = {
          title: title.trim(),
          description: trimmedDesc ? trimmedDesc : null,
          type: VISION_BOARD_ITEM_TYPE_VALUES[type],
          sectionId: presetSectionId ?? undefined,
          imageFileKey: image?.fileKey ?? null,
          locationName: location?.location ? location.location : null,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          targetDate: targetDate ? targetDate.toISOString() : null,
          budget: budgetValue,
          externalReference: trimmedRef ? trimmedRef : null,
          notes: trimmedNotes ? trimmedNotes : null,
        };
        await visionBoardService.createItem(payload);
        showSuccessOverlay('Added to your vision');
      }
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
      showErrorOverlay(editingId ? "Couldn't save vision" : "Couldn't add to vision");
      // Stay on the screen with the draft intact so the user can retry.
    } finally {
      setSaving(false);
    }
  }, [
    title,
    uploadingImage,
    saving,
    budget,
    externalReference,
    notes,
    description,
    isEditing,
    editingId,
    type,
    image,
    location,
    targetDate,
    presetSectionId,
    navigation,
  ]);

  const previewUri = useMemo(() => (image ? resolveMediaUrl(image.previewUri) : null), [image]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title={isEditing ? 'Edit vision' : 'Add to Our Vision'} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title={isEditing ? 'Edit vision' : 'Add to Our Vision'}
        onBack={() => navigation.goBack()}
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
          {/* Type */}
          <Text style={styles.fieldLabel}>VISION ESSENCE</Text>
          <View style={styles.typeRow}>
            {VISION_BOARD_ITEM_TYPE_ORDER.map((t) => (
              <Pressable
                key={t}
                style={[styles.typeChip, type === t && styles.typeChipActive]}
                onPress={() => setType(t)}
                accessibilityRole="button"
                accessibilityState={{ selected: type === t }}
              >
                <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
                  {VISION_BOARD_ITEM_TYPE_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Image */}
          <Text style={styles.fieldLabel}>VISUAL ANCHOR</Text>
          {previewUri ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: previewUri }} style={styles.image} resizeMode="cover" />
              {image?.uploading ? (
                <View style={styles.imageOverlay}>
                  <ActivityIndicator color={colors.gold} />
                  <Text style={styles.overlayText}>Uploading…</Text>
                </View>
              ) : null}
              {image?.failed ? (
                <View style={styles.imageOverlay}>
                  <Text style={styles.overlayText}>{image.errorMessage ?? 'Upload failed'}</Text>
                  <Pressable style={styles.retryChip} onPress={retryImage}>
                    <Text style={styles.retryChipText}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}
              <Pressable style={styles.removeImageBtn} onPress={removeImage} hitSlop={8}>
                <Text style={styles.removeImageText}>✕</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.imagePicker} onPress={pickImage} accessibilityRole="button">
              <Text style={styles.imagePickerText}>+ Add a photo</Text>
            </Pressable>
          )}

          {/* Title */}
          <Text style={styles.fieldLabel}>VISION TITLE</Text>
          <TextInput
            style={styles.input}
            placeholder="Hike the Path of the Gods…"
            placeholderTextColor={colors.neutralSubtle}
            value={title}
            onChangeText={setTitle}
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          {/* Description */}
          <Text style={styles.fieldLabel}>DESCRIPTION & FEELING</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="What it looks and feels like…"
            placeholderTextColor={colors.neutralSubtle}
            value={description}
            onChangeText={setDescription}
            multiline
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          {/* Location */}
          <Text style={styles.fieldLabel}>LOCATION</Text>
          <LocationPicker
            value={location}
            onChange={setLocation}
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          {/* Target date */}
          <DateTimeField
            label="TARGET HORIZON"
            mode="date"
            value={targetDate}
            onChange={setTargetDate}
            onClear={() => setTargetDate(null)}
            placeholder="Someday"
            style={styles.spaced}
          />

          {/* Budget */}
          <Text style={styles.fieldLabel}>TARGET BUDGET</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1200"
            placeholderTextColor={colors.neutralSubtle}
            value={budget}
            onChangeText={setBudget}
            keyboardType="numeric"
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          {/* External reference */}
          <Text style={styles.fieldLabel}>INSPIRATION / LINK</Text>
          <TextInput
            style={styles.input}
            placeholder="A link or where it came from"
            placeholderTextColor={colors.neutralSubtle}
            value={externalReference}
            onChangeText={setExternalReference}
            autoCapitalize="none"
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          {/* Notes */}
          <Text style={styles.fieldLabel}>NOTES</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Anything else to remember"
            placeholderTextColor={colors.neutralSubtle}
            value={notes}
            onChangeText={setNotes}
            multiline
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              (saving || uploadingImage || !title.trim() || pressed) && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={saving || uploadingImage || !title.trim()}
            accessibilityRole="button"
            accessibilityLabel="Save to our vision"
          >
            {saving ? (
              <ActivityIndicator color={colors.ctaText} />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEditing ? 'Save changes' : 'Save to Our Vision'}
              </Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  fieldLabel: {
    ...typography.label,
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  spaced: { marginTop: spacing.md },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  typeChipActive: { borderColor: colors.gold, backgroundColor: 'rgba(139,111,58,0.14)' },
  typeChipText: { ...typography.bodySm, color: colors.neutralMuted },
  typeChipTextActive: { color: colors.gold },

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
  overlayText: { ...typography.bodySm, color: colors.neutral, textAlign: 'center', paddingHorizontal: spacing.md },
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
