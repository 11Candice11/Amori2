/**
 * AddTimelineEventScreen — record or edit a relationship milestone.
 *
 * POSTs a real /api/timeline event, or PATCHes an existing one when an
 * `eventId` route param is present. The user picks a milestone type, a title,
 * an event date (YYYY-MM-DD), optional description/location, and optional
 * photos. Photos are uploaded straight away (showing a local preview while the
 * upload catches up), then attached to the milestone via
 * POST /api/timeline/{id}/media. On success we pop back to the timeline, which
 * refetches on focus.
 */
import React, { useCallback, useEffect, useState } from 'react';
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
  toIsoDate,
  type LocationValue,
} from '../../../shared/components/inputs';
import type { TimelineStackParamList } from '../../../navigation/TimelineStackParamList';
import type { TimelineEventType } from '../../../services/api/types';
import { timelineService } from '../services/timelineService';
import { mediaService } from '../../../services/media/mediaService';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import {
  TIMELINE_EVENT_EMOJI,
  TIMELINE_EVENT_LABELS,
  TIMELINE_EVENT_ORDER,
} from '../types/timeline.types';

type Nav = NativeStackNavigationProp<TimelineStackParamList, 'AddTimelineEvent'>;
type AddTimelineEventRoute = RouteProp<TimelineStackParamList, 'AddTimelineEvent'>;

/**
 * A photo the user picked. `previewUri` is the on-device file (or resolved URL
 * for an already-attached photo) so the thumbnail shows immediately;
 * `fileKey`/`photoKey` is what gets attached to the milestone.
 */
interface PickedPhoto {
  id: string;
  previewUri: string;
  fileType?: string;
  fileName?: string;
  /** The storage key: present once uploaded (or for an existing photo). */
  fileKey: string | null;
  uploading: boolean;
  failed: boolean;
  errorMessage?: string;
}

let photoIdSeq = 0;

export function AddTimelineEventScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<AddTimelineEventRoute>();
  // When an eventId is passed we're editing an existing milestone.
  const editingId = route.params?.eventId ?? null;
  const isEditing = editingId != null;

  const [eventType, setEventType] = useState<TimelineEventType>('FirstDate');
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState<Date>(() => new Date());
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // While the existing milestone loads in edit mode.
  const [loadingEvent, setLoadingEvent] = useState(isEditing);
  // Photo keys already attached to the milestone being edited.
  const [existingPhotoKeys, setExistingPhotoKeys] = useState<string[]>([]);

  // In edit mode, load the milestone once and prefill the form.
  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    (async () => {
      try {
        const e = await timelineService.getEvent(editingId);
        if (cancelled) return;
        setEventType(e.eventType);
        setTitle(e.title);
        const [y, m, d] = e.eventDate.split('-').map(Number);
        if (y && m && d) setEventDate(new Date(y, m - 1, d));
        setDescription(e.description ?? '');
        if (e.location != null && e.latitude != null && e.longitude != null) {
          setLocation({
            location: e.location,
            latitude: e.latitude,
            longitude: e.longitude,
          });
        }
        // Show the already-attached photos as previews (already have keys).
        const attached: PickedPhoto[] = e.photos
          .filter((p) => !!p.url)
          .map((p) => ({
            id: `existing-${p.photoKey}`,
            previewUri: resolveMediaUrl(p.url),
            fileKey: p.photoKey,
            uploading: false,
            failed: false,
          }));
        setPhotos(attached);
        setExistingPhotoKeys(attached.map((p) => p.fileKey as string));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load this milestone.');
        }
      } finally {
        if (!cancelled) setLoadingEvent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId]);

  const uploadingPhotos = photos.some((p) => p.uploading);
  // The picker can only produce real dates, so the gates are a title + no
  // in-flight photo uploads.
  const canSave = title.trim().length > 0 && !saving && !uploadingPhotos;

  const uploadPhoto = useCallback(
    (id: string, file: { uri: string; type?: string; name?: string }) => {
      mediaService
        .uploadImage({
          uri: file.uri,
          type: file.type ?? 'image/jpeg',
          name: file.name ?? `milestone-${Date.now()}.jpg`,
        })
        .then((uploaded) => {
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === id
                ? {
                    ...p,
                    fileKey: uploaded.fileKey,
                    uploading: false,
                    failed: false,
                    errorMessage: undefined,
                  }
                : p,
            ),
          );
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Could not upload that photo.';
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === id
                ? { ...p, uploading: false, failed: true, errorMessage: message }
                : p,
            ),
          );
          setError(message);
        });
    },
    [],
  );

  const pickPhotos = useCallback(() => {
    setError(null);
    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      // Cap the resolution so full-size phone photos stay well under the
      // backend's upload limit (a common cause of upload failures).
      maxWidth: 2048,
      maxHeight: 2048,
      includeBase64: false,
      selectionLimit: 0, // allow multiple
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        setError('Could not access photos: ' + response.errorMessage);
        return;
      }

      const assets = (response.assets ?? []).filter((a) => a.uri);
      if (assets.length === 0) return;

      const picked: PickedPhoto[] = assets.map((asset) => ({
        id: `photo-${photoIdSeq++}`,
        previewUri: asset.uri as string,
        fileType: asset.type,
        fileName: asset.fileName,
        fileKey: null,
        uploading: true,
        failed: false,
      }));

      setPhotos((prev) => [...prev, ...picked]);

      picked.forEach((p) => {
        uploadPhoto(p.id, { uri: p.previewUri, type: p.fileType, name: p.fileName });
      });
    });
  }, [uploadPhoto]);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const retryPhoto = useCallback(
    (photo: PickedPhoto) => {
      setError(null);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id
            ? { ...p, uploading: true, failed: false, errorMessage: undefined }
            : p,
        ),
      );
      uploadPhoto(photo.id, {
        uri: photo.previewUri,
        type: photo.fileType,
        name: photo.fileName,
      });
    },
    [uploadPhoto],
  );

  const handleSave = useCallback(async () => {
    if (title.trim().length === 0) {
      setError('Give the milestone a title.');
      return;
    }
    if (uploadingPhotos) {
      setError('Give the photos a moment to finish uploading.');
      return;
    }
    if (saving) return;

    setSaving(true);
    setError(null);

    // All successfully-uploaded photo keys currently on the form.
    const fileKeys = photos
      .map((p) => p.fileKey)
      .filter((k): k is string => !!k);

    try {
      if (isEditing && editingId) {
        await timelineService.updateEvent(editingId, {
          title: title.trim(),
          eventDate: toIsoDate(eventDate),
          description: description.trim() || null,
          location: location?.location.trim() || null,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          eventType,
        });
        // Attach newly-added photos, and remove ones the user deleted.
        const newKeys = fileKeys.filter((k) => !existingPhotoKeys.includes(k));
        for (const photoKey of newKeys) {
          await timelineService.addMedia(editingId, { photoKey });
        }
        const removedKeys = existingPhotoKeys.filter((k) => !fileKeys.includes(k));
        for (const photoKey of removedKeys) {
          await timelineService.removeMedia(editingId, photoKey);
        }
      } else {
        // Create with the uploaded photo keys in one shot.
        await timelineService.createEvent({
          title: title.trim(),
          eventDate: toIsoDate(eventDate),
          description,
          location: location?.location.trim() || null,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          eventType,
          photoKeys: fileKeys,
        });
      }

      showSuccessOverlay(isEditing ? 'Milestone saved' : 'Milestone created');
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this milestone.');
      showErrorOverlay(isEditing ? "Couldn't save milestone" : "Couldn't create milestone");
      setSaving(false);
    }
  }, [
    title,
    uploadingPhotos,
    saving,
    eventDate,
    description,
    location,
    eventType,
    photos,
    navigation,
    isEditing,
    editingId,
    existingPhotoKeys,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title={isEditing ? 'Edit Milestone' : 'New Milestone'}
        onBack={() => navigation.goBack()}
        showNotificationBell={false}
      />

      {loadingEvent ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : (

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Mark a moment</Text>
          <Text style={styles.subtitle}>A milestone worth remembering, together.</Text>

          {/* Type selector */}
          <Text style={styles.label}>Type</Text>
          <View style={styles.chipWrap}>
            {TIMELINE_EVENT_ORDER.map((t) => {
              const active = t === eventType;
              return (
                <Pressable
                  key={t}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setEventType(t)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={TIMELINE_EVENT_LABELS[t]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {TIMELINE_EVENT_EMOJI[t]} {TIMELINE_EVENT_LABELS[t]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Title */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. The night we met"
            placeholderTextColor={colors.neutralSubtle}
            maxLength={120}
            accessibilityLabel="Milestone title"
          />

          {/* Date */}
          <DateTimeField
            label="Date"
            mode="date"
            value={eventDate}
            onChange={setEventDate}
            pickerTitle="When did it happen?"
            accessibilityLabel="Milestone date"
            style={styles.dateField}
          />

          {/* Location */}
          <Text style={styles.label}>Location (optional)</Text>
          <LocationPicker
            value={location}
            onChange={setLocation}
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          {/* Description */}
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="What made it special?"
            placeholderTextColor={colors.neutralSubtle}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            accessibilityLabel="Note"
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          {/* Photos */}
          <Text style={styles.label}>Photos (optional)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoRow}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              style={styles.addPhotoTile}
              onPress={pickPhotos}
              accessibilityRole="button"
              accessibilityLabel="Add photos"
            >
              <Text style={styles.addPhotoPlus}>+</Text>
              <Text style={styles.addPhotoText}>Add</Text>
            </Pressable>

            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoTile}>
                <Image source={{ uri: photo.previewUri }} style={styles.photoThumb} />

                {photo.uploading ? (
                  <View style={styles.photoOverlay}>
                    <ActivityIndicator color={colors.ctaText} />
                  </View>
                ) : null}

                {photo.failed ? (
                  <Pressable
                    style={styles.photoOverlay}
                    onPress={() => retryPhoto(photo)}
                    accessibilityRole="button"
                    accessibilityLabel="Retry upload"
                  >
                    <Text style={styles.photoRetryText}>Retry</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  style={styles.photoRemove}
                  onPress={() => removePhoto(photo.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                >
                  <Text style={styles.photoRemoveText}>×</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel="Save milestone"
          >
            {saving ? (
              <ActivityIndicator color={colors.ctaText} />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEditing ? 'Save changes' : 'Save milestone'}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      )}

      <KeyboardDoneAccessory />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerKicker: { ...typography.label, color: colors.gold, fontSize: 11, letterSpacing: 1.5 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.headlineSm, color: colors.neutral, fontSize: 26 },
  subtitle: { ...typography.body, color: colors.neutralMuted, fontSize: 14, marginTop: 4 },
  label: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  chipActive: { borderColor: colors.gold, backgroundColor: 'rgba(197,163,101,0.16)' },
  chipText: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 13 },
  chipTextActive: { color: colors.gold },
  input: {
    ...typography.body,
    color: colors.neutral,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 120 },
  dateField: { marginTop: spacing.lg },
  error: { ...typography.bodySm, color: colors.emergency, marginTop: spacing.md },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 26,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 16 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  photoRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  addPhotoTile: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoPlus: { color: colors.gold, fontSize: 26, lineHeight: 28 },
  addPhotoText: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 12 },
  photoTile: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
  },
  photoThumb: { width: '100%', height: '100%' },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  photoRetryText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 13 },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  photoRemoveText: { color: '#fff', fontSize: 15, lineHeight: 17, fontWeight: '600' },
});
