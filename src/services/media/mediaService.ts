/**
 * mediaService — uploads images to the backend and returns a storage key + URL.
 *
 * Endpoint: POST /api/media (multipart/form-data, field name "file").
 */
import { api, type UploadFile } from '../api/client';
import type { MediaUploadResponse } from '../api/types';

export const mediaService = {
  /** Upload a single image file. */
  async uploadImage(file: UploadFile): Promise<MediaUploadResponse> {
    return api.upload<MediaUploadResponse>('/api/media', file);
  },
};
