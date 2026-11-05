/**
 * useImageAttachment — the standard two-step Amori photo flow for a form with a
 * single image: pick with react-native-image-picker (capped at 2048px so
 * full-size phone photos stay under the backend limit), upload via
 * mediaService.uploadImage to get a fileKey, then the form attaches that key to
 * the record on save.
 *
 * A failed upload never loses the draft: the preview stays, `image.failed` is
 * set, and `retryImage` tries again.
 */
import { useCallback, useState } from 'react';
import {
  launchImageLibrary,
  type ImageLibraryOptions,
  type ImagePickerResponse,
  type MediaType,
} from 'react-native-image-picker';

import { mediaService } from '../../../services/media/mediaService';

export interface PickedImage {
  previewUri: string;
  fileType?: string;
  fileName?: string;
  /** Present once uploaded. */
  fileKey: string | null;
  uploading: boolean;
  failed: boolean;
  errorMessage?: string;
}

export interface ImageAttachment {
  image: PickedImage | null;
  /** Latest photo problem (picker access or upload), shown by the form. */
  error: string | null;
  pickImage: () => void;
  retryImage: () => void;
  removeImage: () => void;
}

/**
 * @param filePrefix used to name uploads when the picker gives no file name.
 * @param existing   an already-uploaded photo to start with (edit mode). Only
 *                   read on the first render.
 */
export function useImageAttachment(
  filePrefix: string,
  existing?: { fileKey: string; url: string } | null,
): ImageAttachment {
  const [image, setImage] = useState<PickedImage | null>(
    existing
      ? { previewUri: existing.url, fileKey: existing.fileKey, uploading: false, failed: false }
      : null,
  );
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    (file: { uri: string; type?: string; name?: string }) => {
      mediaService
        .uploadImage({
          uri: file.uri,
          type: file.type ?? 'image/jpeg',
          name: file.name ?? `${filePrefix}-${Date.now()}.jpg`,
        })
        .then((uploaded) => {
          // Ignore the result if the user has since removed or swapped the photo.
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
          setError(message);
        });
    },
    [filePrefix],
  );

  const pickImage = useCallback(() => {
    setError(null);
    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
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

      setImage({
        previewUri: asset.uri,
        fileType: asset.type,
        fileName: asset.fileName,
        fileKey: null,
        uploading: true,
        failed: false,
      });
      upload({ uri: asset.uri, type: asset.type, name: asset.fileName });
    });
  }, [upload]);

  const retryImage = useCallback(() => {
    if (!image) return;
    setError(null);
    setImage({ ...image, uploading: true, failed: false, errorMessage: undefined });
    upload({ uri: image.previewUri, type: image.fileType, name: image.fileName });
  }, [image, upload]);

  const removeImage = useCallback(() => {
    setImage(null);
    setError(null);
  }, []);

  return { image, error, pickImage, retryImage, removeImage };
}
