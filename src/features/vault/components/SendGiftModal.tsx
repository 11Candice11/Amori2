/**
 * SendGiftModal — compose and send a gift to your partner, with the same
 * spin-to-reveal animation used across the app.
 *
 * The card spins up (via the shared FlipRevealModal); its back face is a
 * scrollable compose form: title, date, location, an image, a link, a note,
 * and a voice note. On send it:
 *   1. Creates a gift-only memory (NOT added to the regular memories feed)
 *   2. Uploads and attaches the image / voice note / link
 *   3. Sends the gift directly to the partner's vault with a notification
 *
 * This uses the dedicated /api/vault/gifts/create endpoint, which creates
 * and sends the gift in one operation without polluting the memories feed.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  launchImageLibrary,
  type ImageLibraryOptions,
  type MediaType,
} from 'react-native-image-picker';

import { colors, spacing, typography, layout } from '../../../shared/theme';
import {
  FlipRevealModal,
  type FlipFace,
} from '../../../shared/components/overlays/FlipRevealModal';
import {
  DateTimeField,
  LocationPicker,
  KeyboardDoneAccessory,
  KEYBOARD_DONE_ACCESSORY_ID,
  type LocationValue,
} from '../../../shared/components/inputs';
import {
  VoiceNoteRecorder,
  type RecordedVoiceNote,
} from '../../memories/components/VoiceNoteRecorder';
import { getCardImage } from '../../../utils/cardSelector';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import { mediaService } from '../../../services/media/mediaService';
import { vaultService } from '../services/vaultService';
import type { CreateGiftMediaRequest } from '../types/vault.types';
import {
  MEMORY_CATEGORY_VALUES,
  MEMORY_MEDIA_TYPE_VALUES,
} from '../../memories/types/memory.types';

const CARD_WIDTH = Math.min(layout.width - spacing.lg * 2, 360);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.62);

/** Max length for an attached video clip — TikTok-length. */
const MAX_VIDEO_SECONDS = 60;

export type SendGiftModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Called after a gift is successfully created + saved, so the vault refreshes. */
  onSent?: () => void;
  /** The card art (1-10) the gift is wrapped in. Defaults to a random card. */
  cardNumber?: number;
};

/** Pick a stable-ish random card 1-10 for the wrapper. */
function randomCard(): number {
  return 1 + Math.floor(Math.random() * 10);
}

export function SendGiftModal({ visible, onClose, onSent, cardNumber }: SendGiftModalProps) {
  const [card] = useState(() => cardNumber ?? randomCard());
  const cardImage = getCardImage(card);

  const [title, setTitle] = useState('');
  const [giftAt, setGiftAt] = useState<Date>(() => new Date());
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [note, setNote] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // A single visual attachment — a photo OR a short video clip. Preview
  // immediately, upload in the background.
  const [image, setImage] = useState<{
    previewUri: string;
    kind: 'photo' | 'video';
    fileType?: string;
    fileName?: string;
    fileKey: string | null;
    uploading: boolean;
    failed: boolean;
  } | null>(null);

  // A voice note: local uri + duration, uploaded to get a fileKey.
  const [voiceNote, setVoiceNote] = useState<{
    localUri: string;
    durationSeconds: number;
    fileKey: string | null;
    uploading: boolean;
    failed: boolean;
  } | null>(null);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTitle('');
    setGiftAt(new Date());
    setLocation(null);
    setNote('');
    setLinkUrl('');
    setLinkTitle('');
    setImage(null);
    setVoiceNote(null);
    setError(null);
    setSending(false);
  }, []);

  const uploadImage = useCallback(
    (previewUri: string, kind: 'photo' | 'video', fileType?: string, fileName?: string) => {
      const isVideo = kind === 'video';
      mediaService
        .uploadImage({
          uri: previewUri,
          type: fileType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
          name: fileName ?? (isVideo ? `gift-${Date.now()}.mp4` : `gift-${Date.now()}.jpg`),
        })
        .then((uploaded) => {
          setImage((prev) =>
            prev && prev.previewUri === previewUri
              ? { ...prev, fileKey: uploaded.fileKey, uploading: false, failed: false }
              : prev,
          );
        })
        .catch((err: unknown) => {
          setImage((prev) =>
            prev && prev.previewUri === previewUri
              ? { ...prev, uploading: false, failed: true }
              : prev,
          );
          setError(
            err instanceof Error
              ? err.message
              : isVideo
              ? 'Could not upload that video.'
              : 'Could not upload that image.',
          );
        });
    },
    [],
  );

  const pickImage = useCallback(() => {
    setError(null);
    const options: ImageLibraryOptions = {
      // Allow a photo OR a short video clip.
      mediaType: 'mixed' as MediaType,
      quality: 0.8,
      maxWidth: 2048,
      maxHeight: 2048,
      selectionLimit: 1,
    };
    launchImageLibrary(options, (response) => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        setError('Could not access your library: ' + response.errorMessage);
        return;
      }
      const asset = (response.assets ?? [])[0];
      if (!asset?.uri) return;
      const isVideo = (asset.type?.startsWith('video') ?? false) || asset.duration != null;
      // TikTok-length clips only.
      if (isVideo && (asset.duration ?? 0) > MAX_VIDEO_SECONDS) {
        setError(`Videos must be ${MAX_VIDEO_SECONDS} seconds or shorter.`);
        return;
      }
      const kind = isVideo ? ('video' as const) : ('photo' as const);
      setImage({
        previewUri: asset.uri,
        kind,
        fileType: asset.type,
        fileName: asset.fileName,
        fileKey: null,
        uploading: true,
        failed: false,
      });
      uploadImage(asset.uri, kind, asset.type, asset.fileName);
    });
  }, [uploadImage]);

  const uploadVoice = useCallback((localUri: string) => {
    mediaService
      .uploadAudio({ uri: localUri, type: 'audio/m4a', name: `gift-voice-${Date.now()}.m4a` })
      .then((uploaded) => {
        setVoiceNote((prev) =>
          prev && prev.localUri === localUri
            ? { ...prev, fileKey: uploaded.fileKey, uploading: false, failed: false }
            : prev,
        );
      })
      .catch((err: unknown) => {
        setVoiceNote((prev) =>
          prev && prev.localUri === localUri ? { ...prev, uploading: false, failed: true } : prev,
        );
        setError(err instanceof Error ? err.message : 'Could not upload the voice note.');
      });
  }, []);

  const handleVoiceRecorded = useCallback(
    (rec: RecordedVoiceNote) => {
      setError(null);
      setVoiceNote({
        localUri: rec.uri,
        durationSeconds: rec.durationSeconds,
        fileKey: null,
        uploading: true,
        failed: false,
      });
      uploadVoice(rec.uri);
    },
    [uploadVoice],
  );

  const busyUploading = (image?.uploading ?? false) || (voiceNote?.uploading ?? false);

  const handleSend = useCallback(
    async (close: () => void) => {
      if (title.trim().length === 0) {
        setError('Give your gift a title.');
        return;
      }
      if (busyUploading) {
        setError('Give the attachments a moment to finish uploading.');
        return;
      }
      if (sending) return;

      let link = linkUrl.trim();
      if (link) {
        if (!/^https?:\/\//i.test(link)) link = `https://${link}`;
        if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(link)) {
          setError('That link doesn’t look like a valid URL.');
          return;
        }
      }

      setSending(true);
      setError(null);

      try {
        // Build media array with all attachments
        const media: CreateGiftMediaRequest[] = [];

        if (image?.fileKey) {
          media.push({
            fileKey: image.fileKey,
            mediaType:
              image.kind === 'video'
                ? MEMORY_MEDIA_TYPE_VALUES.Video
                : MEMORY_MEDIA_TYPE_VALUES.Photo,
          });
        }

        if (voiceNote?.fileKey) {
          media.push({
            fileKey: voiceNote.fileKey,
            mediaType: MEMORY_MEDIA_TYPE_VALUES.VoiceNote,
            durationSeconds: voiceNote.durationSeconds,
          });
        }

        if (link) {
          media.push({
            fileKey: link,
            mediaType: MEMORY_MEDIA_TYPE_VALUES.Link,
            title: linkTitle.trim() || null,
          });
        }

        // Create and send the gift in one operation (doesn't create a regular memory)
        const result = await vaultService.createAndSend({
          title: title.trim(),
          category: MEMORY_CATEGORY_VALUES.Celebration,
          memoryDateTime: giftAt.toISOString(),
          location: location?.location.trim() || null,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          description: note.trim() || null,
          cardNumber: card,
          media: media.length > 0 ? media : undefined,
        });

        showSuccessOverlay(`Gift sent to ${result.recipientName} 🎁`);
        resetForm();
        onSent?.();
        close();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send the gift.');
        showErrorOverlay("Couldn't send gift");
        setSending(false);
      }
    },
    [
      title,
      busyUploading,
      sending,
      linkUrl,
      linkTitle,
      giftAt,
      location,
      note,
      image,
      voiceNote,
      card,
      resetForm,
      onSent,
    ],
  );

  const handleClose = useCallback(() => {
    // Don't wipe a half-filled form mid-send; reset only when idle.
    if (!sending) resetForm();
    onClose();
  }, [sending, resetForm, onClose]);

  return (
    <>
      <FlipRevealModal
        visible={visible}
        onClose={handleClose}
        cardWidth={CARD_WIDTH}
        cardHeight={CARD_HEIGHT}
        hint="Wrap a little something for them"
        front={({ cardStyle, animatedStyle }: FlipFace) => (
          <Animated.View style={[cardStyle, animatedStyle]}>
            <Image source={cardImage} style={styles.cardFaceImage} resizeMode="contain" />
          </Animated.View>
        )}
        back={({ cardStyle, animatedStyle }: FlipFace, close) => (
          <Animated.View style={[cardStyle, styles.cardBack, animatedStyle]}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Send a gift</Text>
              <Pressable
                onPress={close}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              >
                <Text style={styles.closeBtnText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.form}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. A little surprise for you"
                placeholderTextColor={colors.neutralSubtle}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Date</Text>
              <DateTimeField
                label=""
                mode="date"
                value={giftAt}
                onChange={setGiftAt}
                pickerTitle="Gift date"
                accessibilityLabel="Gift date"
              />

              <Text style={styles.label}>Location (optional)</Text>
              <LocationPicker
                value={location}
                onChange={setLocation}
                inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
              />

              <Text style={styles.label}>Photo or video (optional)</Text>
              {image ? (
                <View style={styles.imageWrap}>
                  <Image source={{ uri: image.previewUri }} style={styles.imagePreview} />
                  {image.kind === 'video' && !image.uploading ? (
                    <View style={styles.videoBadge} pointerEvents="none">
                      <Text style={styles.videoBadgeText}>▶</Text>
                    </View>
                  ) : null}
                  {image.uploading ? (
                    <View style={styles.imageOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  ) : null}
                  {image.failed ? (
                    <Pressable
                      style={styles.imageOverlay}
                      onPress={() => {
                        setImage((p) => (p ? { ...p, uploading: true, failed: false } : p));
                        uploadImage(image.previewUri, image.kind, image.fileType, image.fileName);
                      }}
                    >
                      <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={styles.imageRemove}
                    onPress={() => setImage(null)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Remove attachment"
                  >
                    <Text style={styles.imageRemoveText}>×</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.addImageBtn, pressed && styles.pressed]}
                  onPress={pickImage}
                  accessibilityRole="button"
                  accessibilityLabel="Add a photo or video"
                >
                  <Text style={styles.addImageText}>+ Add photo or video</Text>
                </Pressable>
              )}

              <Text style={styles.label}>Link (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. a song or a place"
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

              <Text style={styles.label}>Note (optional)</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Say something sweet…"
                placeholderTextColor={colors.neutralSubtle}
                value={note}
                onChangeText={setNote}
                multiline
                inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
              />

              <Text style={styles.label}>Voice note (optional)</Text>
              <VoiceNoteRecorder
                onRecorded={handleVoiceRecorded}
                onCleared={() => setVoiceNote(null)}
                current={
                  voiceNote
                    ? { uri: voiceNote.localUri, durationSeconds: voiceNote.durationSeconds }
                    : null
                }
              />
              {voiceNote?.uploading ? (
                <Text style={styles.hintText}>Uploading voice note…</Text>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                style={({ pressed }) => [
                  styles.sendBtn,
                  (sending || busyUploading) && styles.sendBtnDisabled,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleSend(close)}
                disabled={sending || busyUploading}
                accessibilityRole="button"
                accessibilityLabel="Send gift"
              >
                {sending ? (
                  <ActivityIndicator color={colors.ctaText} />
                ) : (
                  <Text style={styles.sendBtnText}>Send gift</Text>
                )}
              </Pressable>
            </ScrollView>
          </Animated.View>
        )}
      />
      <KeyboardDoneAccessory />
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  cardFaceImage: { width: '100%', height: '100%' },
  cardBack: {
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeBtnText: {
    color: colors.neutral,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '600',
  },
  form: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  input: {
    ...typography.body,
    color: colors.neutral,
    fontSize: 15,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  linkTitleInput: {
    marginTop: spacing.sm,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  addImageBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  addImageText: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 14,
  },
  imageWrap: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  imagePreview: { width: '100%', height: '100%' },
  videoBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadgeText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 14,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  retryText: {
    ...typography.bodySemiBold,
    color: '#fff',
    fontSize: 14,
  },
  imageRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageRemoveText: { color: '#fff', fontSize: 16, lineHeight: 18, fontWeight: '600' },
  hintText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  error: {
    ...typography.bodySm,
    color: colors.emergency,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  sendBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 15,
  },
});
