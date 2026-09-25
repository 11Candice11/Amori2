/**
 * mediaService — uploads media (images and audio) to the backend and returns a
 * storage key + URL to attach to a domain record.
 *
 * Endpoint: POST /api/media (multipart/form-data, field name "file"). The
 * backend accepts image and audio content types.
 */
import { api, type UploadFile } from '../api/client';
import type { MediaUploadResponse } from '../api/types';

export const mediaService = {
  /** Upload a single image file. */
  async uploadImage(file: UploadFile): Promise<MediaUploadResponse> {
    return api.upload<MediaUploadResponse>('/api/media', file);
  },

  /**
   * Upload a single audio file (voice note). Same endpoint as images — the
   * `type` on the file just needs to be an audio MIME type (e.g. "audio/m4a").
   */
  async uploadAudio(file: UploadFile): Promise<MediaUploadResponse> {
    return api.upload<MediaUploadResponse>('/api/media', file);
  },
};
