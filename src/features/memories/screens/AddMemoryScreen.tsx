/**
 * AddMemoryScreen — a real compose form that POSTs a memory to /api/memories.
 *
 * A memory REQUIRES a date and time (when it happened). Both are picked with
 * `DateTimeField` and held as a single `Date`, which is sent as an ISO 8601
 * date-time. A memory can't be in the future, so the date picker is capped at
 * today.
 *
 * Photos can be attached: each picked image is uploaded straight away (showing
 * a local preview while the upload catches up), then attached to the memory
 * after it's created via POST /api/memories/{id}/media.
 *
 * On success it navigates back; the Memories list refetches on focus so the
 * new memory appears immediately.
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
} from '../../../shared/components/inputs';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { memoriesService } from '../services/memoriesService';
import { timelineService } from '../../timeline/services/timelineService';
import { toIsoDate } from '../../../shared/components/inputs';
import { mediaService } from '../../../services/media/mediaService';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import { LocationPicker, type LocationValue } from '../../../shared/components/inputs';
import {
  VoiceNoteRecorder,
  type RecordedVoiceNote,
} from '../components/VoiceNoteRecorder';
import {
  decodeMemoryCategory,
  isLinkMedia,
  isVideoMedia,
  isVisualMedia,
  isVoiceNoteMedia,
  MEMORY_CATEGORY_VALUES,
  MEMORY_MEDIA_TYPE_VALUES,
  type MemoryCategory,
} from '../types/memory.types';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'AddMemory'>;
type AddMemoryRoute = RouteProp<TogetherStackParamList, 'AddMemory'>;

/** Max length for an attached video clip — TikTok-length. */
const MAX_VIDEO_SECONDS = 60;

const CATEGORY_OPTIONS: MemoryCategory[] = [
  'Everyday',
  'Trip',
  'Date',
  'Milestone',
  'Adventure',
  'Celebration',
];

/**
 * A photo the user picked. `previewUri` is the on-device file so the thumbnail
 * shows the moment it's picked; `fileKey` arrives once the upload finishes and
 * is what gets attached to the memory. `uploading`/`failed` drive the overlay.
 */
interface PickedPhoto {
  id: string;
  previewUri: string;
  /** Whether this asset is a still photo or a short video clip. */
  kind: 'photo' | 'video';
  /** The picker's mime type and filename, kept so retries send correct metadata. */
  fileType?: string;
  fileName?: string;
  fileKey: string | null;
  uploading: boolean;
  failed: boolean;
  /** Why the last upload failed, surfaced to the user. */
  errorMessage?: string;
}

let photoIdSeq = 0;

export function AddMemoryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<AddMemoryRoute>();
  // When a memoryId is passed we're editing an existing memory, not creating one.
  const editingId = route.params?.memoryId ?? null;
  const isEditing = editingId != null;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('Everyday');
  /** When the memory happened — the date and time fields edit this one value. */
  const [memoryAt, setMemoryAt] = useState<Date>(() => new Date());
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  // An optional link attachment: the URL and an optional friendly title.
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  /**
   * A voice note attached to this memory. `localUri` is the just-recorded file;
   * `fileKey` is filled once it uploads. `existing` marks a note that was
   * already attached (edit mode) so we don't re-upload it. `uploading`/`failed`
   * drive the inline status.
   */
  const [voiceNote, setVoiceNote] = useState<{
    localUri: string;
    durationSeconds: number;
    fileKey: string | null;
    uploading: boolean;
    failed: boolean;
    existing: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // While the existing memory loads in edit mode.
  const [loadingMemory, setLoadingMemory] = useState(isEditing);
  // Photos already attached to the memory being edited (kept as-is on save).
  const [existingMediaKeys, setExistingMediaKeys] = useState<string[]>([]);

  // A memory is something that already happened.
  const today = useMemo(() => new Date(), []);

  // In edit mode, load the memory once and prefill the form.
  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    (async () => {
      try {
        const m = await memoriesService.getById(editingId);
        if (cancelled) return;
        setTitle(m.title);
        setCategory(decodeMemoryCategory(m.category));
        const when = new Date(m.memoryDateTime);
        if (!Number.isNaN(when.getTime())) setMemoryAt(when);
        if (m.location != null && m.latitude != null && m.longitude != null) {
          setLocation({
            location: m.location,
            latitude: m.latitude,
            longitude: m.longitude,
          });
        }
        setDescription(m.description ?? '');
        // Show the already-attached photos AND videos as previews (they already
        // have fileKeys, so they're kept as-is on save).
        const attached: PickedPhoto[] = m.media
          .filter((mm) => isVisualMedia(mm.mediaType) && !!mm.url)
          .map((mm) => ({
            id: `existing-${mm.id}`,
            previewUri: resolveMediaUrl(mm.url),
            kind: isVideoMedia(mm.mediaType) ? ('video' as const) : ('photo' as const),
            fileKey: mm.fileKey,
            uploading: false,
            failed: false,
          }));
        setPhotos(attached);
        setExistingMediaKeys(
          attached.map((p) => p.fileKey).filter((k): k is string => !!k),
        );

        // Prefill an existing link, if any (first link wins in the form).
        const existingLink = m.media.find((mm) => isLinkMedia(mm.mediaType));
        if (existingLink) {
          setLinkUrl(existingLink.url || existingLink.fileKey);
          setLinkTitle(existingLink.title ?? '');
        }

        // Prefill an existing voice note (playable + kept as-is on save).
        const existingVoice = m.media.find((mm) => isVoiceNoteMedia(mm.mediaType) && !!mm.url);
        if (existingVoice) {
          setVoiceNote({
            localUri: resolveMediaUrl(existingVoice.url),
            durationSeconds: existingVoice.durationSeconds ?? 0,
            fileKey: existingVoice.fileKey,
            uploading: false,
            failed: false,
            existing: true,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load the memory.');
        }
      } finally {
        if (!cancelled) setLoadingMemory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId]);

  const uploadingPhotos = photos.some((p) => p.uploading);
  const canSave = title.trim().length > 0 && !saving && !uploadingPhotos && !(voiceNote?.uploading ?? false);

  const uploadPhoto = useCallback(
    (id: string, file: { uri: string; type?: string; name?: string; kind: 'photo' | 'video' }) => {
      const isVideo = file.kind === 'video';
      const fallbackType = isVideo ? 'video/mp4' : 'image/jpeg';
      const fallbackName = isVideo
        ? `memory-${Date.now()}.mp4`
        : `memory-${Date.now()}.jpg`;
      mediaService
        .uploadImage({
          uri: file.uri,
          type: file.type ?? fallbackType,
          name: file.name ?? fallbackName,
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
            err instanceof Error
              ? err.message
              : isVideo
              ? 'Could not upload that video.'
              : 'Could not upload that photo.';
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
      // Allow photos AND short video clips.
      mediaType: 'mixed' as MediaType,
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
        setError('Could not access your library: ' + response.errorMessage);
        return;
      }

      const allAssets = (response.assets ?? []).filter((a) => a.uri);
      if (allAssets.length === 0) return;

      // TikTok-length clips only: drop any video longer than 60s. (The library
      // picker can't cap duration up front, so we enforce it here.)
      const tooLong = allAssets.filter((a) => (a.duration ?? 0) > MAX_VIDEO_SECONDS);
      const assets = allAssets.filter((a) => (a.duration ?? 0) <= MAX_VIDEO_SECONDS);
      if (tooLong.length > 0) {
        setError(`Videos must be ${MAX_VIDEO_SECONDS} seconds or shorter.`);
      }
      if (assets.length === 0) return;

      const picked: PickedPhoto[] = assets.map((asset) => {
        // react-native-image-picker reports videos with a "video/…" type; fall
        // back to the presence of a duration when the type is missing.
        const isVideo =
          (asset.type?.startsWith('video') ?? false) || asset.duration != null;
        return {
          id: `media-${photoIdSeq++}`,
          previewUri: asset.uri as string,
          kind: isVideo ? ('video' as const) : ('photo' as const),
          fileType: asset.type,
          fileName: asset.fileName,
          fileKey: null,
          uploading: true,
          failed: false,
        };
      });

      setPhotos((prev) => [...prev, ...picked]);

      picked.forEach((p) => {
        uploadPhoto(p.id, {
          uri: p.previewUri,
          type: p.fileType,
          name: p.fileName,
          kind: p.kind,
        });
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
        kind: photo.kind,
      });
    },
    [uploadPhoto],
  );

  // Upload a freshly-recorded voice note so we have a fileKey to attach on save.
  const uploadVoiceNote = useCallback((localUri: string) => {
    mediaService
      .uploadAudio({
        uri: localUri,
        type: 'audio/m4a',
        name: `voice-note-${Date.now()}.m4a`,
      })
      .then((uploaded) => {
        setVoiceNote((prev) =>
          prev && prev.localUri === localUri
            ? { ...prev, fileKey: uploaded.fileKey, uploading: false, failed: false }
            : prev,
        );
      })
      .catch((err: unknown) => {
        setVoiceNote((prev) =>
          prev && prev.localUri === localUri
            ? { ...prev, uploading: false, failed: true }
            : prev,
        );
        setError(err instanceof Error ? err.message : 'Could not upload the voice note.');
      });
  }, []);

  const handleVoiceRecorded = useCallback(
    (note: RecordedVoiceNote) => {
      setError(null);
      setVoiceNote({
        localUri: note.uri,
        durationSeconds: note.durationSeconds,
        fileKey: null,
        uploading: true,
        failed: false,
        existing: false,
      });
      uploadVoiceNote(note.uri);
    },
    [uploadVoiceNote],
  );

  const clearVoiceNote = useCallback(() => {
    setVoiceNote(null);
  }, []);

  const uploadingVoiceNote = voiceNote?.uploading ?? false;

  const handleSave = useCallback(async () => {
    if (title.trim().length === 0) {
      setError('Give the memory a title.');
      return;
    }
    if (uploadingPhotos) {
      setError('Give the photos a moment to finish uploading.');
      return;
    }
    if (uploadingVoiceNote) {
      setError('Give the voice note a moment to finish uploading.');
      return;
    }
    if (saving) return;

    // Normalise the link: allow a bare "example.com" by defaulting to https,
    // and reject anything that still doesn't look like a URL.
    let trimmedLink = linkUrl.trim();
    if (trimmedLink) {
      if (!/^https?:\/\//i.test(trimmedLink)) trimmedLink = `https://${trimmedLink}`;
      if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(trimmedLink)) {
        setError('That link doesn’t look like a valid URL.');
        return;
      }
    }

    setSaving(true);
    setError(null);

    const payload = {
      title: title.trim(),
      category: MEMORY_CATEGORY_VALUES[category],
      memoryDateTime: memoryAt.toISOString(),
      location: location?.location.trim() || null,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      description: description.trim() || null,
    };

    // All successfully-uploaded visual media (photos + videos) on the form,
    // each with its media type so videos attach as Video, not Photo.
    const uploadedVisuals = photos
      .filter((p): p is PickedPhoto & { fileKey: string } => !!p.fileKey)
      .map((p) => ({
        fileKey: p.fileKey,
        mediaType:
          p.kind === 'video'
            ? MEMORY_MEDIA_TYPE_VALUES.Video
            : MEMORY_MEDIA_TYPE_VALUES.Photo,
      }));
    // Photo keys only — used to mirror photos onto a milestone's timeline event
    // (the timeline stores flat photo keys and has no video support yet).
    const photoKeysForTimeline = photos
      .filter((p) => p.kind === 'photo' && !!p.fileKey)
      .map((p) => p.fileKey as string);

    try {
      if (isEditing && editingId) {
        await memoriesService.update(editingId, payload);
        // Attach any newly-added photos/videos (those not already on the memory).
        const newVisuals = uploadedVisuals.filter(
          (v) => !existingMediaKeys.includes(v.fileKey),
        );
        for (const v of newVisuals) {
          await memoriesService.addMedia(editingId, {
            fileKey: v.fileKey,
            mediaType: v.mediaType,
          });
        }
        // Attach a newly-recorded voice note (an existing one is left as-is).
        if (voiceNote && !voiceNote.existing && voiceNote.fileKey) {
          await memoriesService.addMedia(editingId, {
            fileKey: voiceNote.fileKey,
            mediaType: MEMORY_MEDIA_TYPE_VALUES.VoiceNote,
            durationSeconds: voiceNote.durationSeconds,
          });
        }
        // Attach a newly-entered link (not already on the memory).
        if (trimmedLink && !existingMediaKeys.includes(trimmedLink)) {
          await memoriesService.addMedia(editingId, {
            fileKey: trimmedLink,
            mediaType: MEMORY_MEDIA_TYPE_VALUES.Link,
            title: linkTitle.trim() || null,
          });
        }
      } else {
        const memory = await memoriesService.create(payload);
        // Attach the uploaded photos (skip any that failed to upload).
        for (const v of uploadedVisuals) {
          await memoriesService.addMedia(memory.id, {
            fileKey: v.fileKey,
            mediaType: v.mediaType,
          });
        }
        // Attach the voice note, if one was recorded and uploaded.
        if (voiceNote && voiceNote.fileKey) {
          await memoriesService.addMedia(memory.id, {
            fileKey: voiceNote.fileKey,
            mediaType: MEMORY_MEDIA_TYPE_VALUES.VoiceNote,
            durationSeconds: voiceNote.durationSeconds,
          });
        }
        // Attach the link, if one was entered. For a Link the fileKey IS the URL.
        if (trimmedLink) {
          await memoriesService.addMedia(memory.id, {
            fileKey: trimmedLink,
            mediaType: MEMORY_MEDIA_TYPE_VALUES.Link,
            title: linkTitle.trim() || null,
          });
        }

        // A milestone memory also earns a spot on the relationship timeline, so
        // it shows up in both places. We mirror the title, date, note, location,
        // and any photos onto a new timeline event. (The timeline stores flat
        // photo keys and has no video support yet, so videos aren't mirrored —
        // they still live on the memory itself.)
        if (category === 'Milestone') {
          await timelineService.createEvent({
            title: title.trim(),
            eventDate: toIsoDate(memoryAt),
            description: description.trim() || null,
            location: location?.location.trim() || null,
            latitude: location?.latitude ?? null,
            longitude: location?.longitude ?? null,
            eventType: 'Custom',
            photoKeys: photoKeysForTimeline,
          });
        }
      }

      showSuccessOverlay(isEditing ? 'Memory saved' : 'Memory created');
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the memory.');
      showErrorOverlay(isEditing ? "Couldn't save memory" : "Couldn't create memory");
      setSaving(false);
    }
  }, [
    title,
    uploadingPhotos,
    uploadingVoiceNote,
    saving,
    category,
    memoryAt,
    location,
    description,
    photos,
    voiceNote,
    linkUrl,
    linkTitle,
    navigation,
    isEditing,
    editingId,
    existingMediaKeys,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title={isEditing ? 'Edit Memory' : 'New Memory'}
        onBack={() => navigation.goBack()}
        showNotificationBell={false}
      />

      {loadingMemory ? (
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
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sunset in Santorini"
            placeholderTextColor={colors.neutralSubtle}
            value={title}
            onChangeText={setTitle}
            autoFocus={!isEditing}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORY_OPTIONS.map((c) => {
              const active = c === category;
              return (
                <Pressable
                  key={c}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={c}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.dateTimeRow}>
            <DateTimeField
              label="Date"
              mode="date"
              value={memoryAt}
              onChange={setMemoryAt}
              maximumDate={today}
              pickerTitle="When was this?"
              accessibilityLabel="Memory date"
              style={styles.dateCol}
            />
          </View>

          <Text style={styles.label}>Location (optional)</Text>
          <LocationPicker
            value={location}
            onChange={setLocation}
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="What made this moment special?"
            placeholderTextColor={colors.neutralSubtle}
            value={description}
            onChangeText={setDescription}
            multiline
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          <Text style={styles.label}>Photos & videos (optional)</Text>
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
              accessibilityLabel="Add photos or videos"
            >
              <Text style={styles.addPhotoPlus}>+</Text>
              <Text style={styles.addPhotoText}>Add</Text>
            </Pressable>

            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoTile}>
                <Image source={{ uri: photo.previewUri }} style={styles.photoThumb} />

                {photo.kind === 'video' && !photo.uploading ? (
                  <View style={styles.videoBadge} pointerEvents="none">
                    <Text style={styles.videoBadgeText}>▶</Text>
                  </View>
                ) : null}

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

          <Text style={styles.label}>Link (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. youtube.com/watch?v=…"
            placeholderTextColor={colors.neutralSubtle}
            value={linkUrl}
            onChangeText={setLinkUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />
          {linkUrl.trim().length > 0 ? (
            <TextInput
              style={[styles.input, styles.linkTitleInput]}
              placeholder="Link title (optional)"
              placeholderTextColor={colors.neutralSubtle}
              value={linkTitle}
              onChangeText={setLinkTitle}
              inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
            />
          ) : null}

          <Text style={styles.label}>Voice note (optional)</Text>
          <VoiceNoteRecorder
            onRecorded={handleVoiceRecorded}
            onCleared={clearVoiceNote}
            current={
              voiceNote
                ? { uri: voiceNote.localUri, durationSeconds: voiceNote.durationSeconds }
                : null
            }
          />
          {voiceNote?.uploading ? (
            <Text style={styles.hintText}>Uploading voice note…</Text>
          ) : voiceNote?.failed ? (
            <Text style={styles.error}>Voice note upload failed — record again to retry.</Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              (!canSave || pressed) && styles.saveBtnPressed,
            ]}
            onPress={handleSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel="Save memory"
          >
            {saving ? (
              <ActivityIndicator color={colors.ctaText} />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEditing ? 'Save Changes' : 'Save Memory'}
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    minWidth: 60,
    height: 36,
    justifyContent: 'center',
  },
  backText: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 15,
  },
  headerTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  label: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    ...typography.body,
    color: colors.neutral,
    fontSize: 15,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  chipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(139,111,58,0.14)',
  },
  chipText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.gold,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  dateCol: { flex: 1 },
  photoRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  addPhotoTile: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoPlus: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 26,
    lineHeight: 28,
  },
  addPhotoText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },
  photoTile: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  photoRetryText: {
    ...typography.bodySemiBold,
    color: colors.emergency,
    fontSize: 13,
  },
  videoBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadgeText: {
    color: '#fff',
    fontSize: 10,
    lineHeight: 12,
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
  },
  linkTitleInput: {
    marginTop: spacing.sm,
  },
  hintText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  error: {
    ...typography.bodySm,
    color: colors.emergency,
    marginTop: spacing.md,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnPressed: {
    opacity: 0.6,
  },
  saveBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 15,
  },
});
