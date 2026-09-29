/**
 * visionBoardService — wraps the shared "Us" Vision Board API.
 *
 * Everything is scoped to the authenticated user's relationship server-side.
 *
 * Endpoints (see Amori.Api/Features/VisionBoard/Controllers/VisionBoardController):
 *   GET    /api/vision-board                         → { sections, items }
 *   GET    /api/vision-board/items/{id}              → item
 *   POST   /api/vision-board/items                   → item
 *   PATCH  /api/vision-board/items/{id}              → item
 *   DELETE /api/vision-board/items/{id}              → 204
 *   POST   /api/vision-board/items/{id}/complete     → item
 *   POST   /api/vision-board/items/{id}/uncomplete   → item
 *   POST   /api/vision-board/items/{id}/move         → item
 *   POST   /api/vision-board/items/{id}/pin          → item
 *   POST   /api/vision-board/items/reorder           → 204
 *   GET    /api/vision-board/sections                → section[]
 *   POST   /api/vision-board/sections                → section
 *   PATCH  /api/vision-board/sections/{id}           → section
 *   DELETE /api/vision-board/sections/{id}           → 204
 *   POST   /api/vision-board/sections/reorder        → 204
 */
import { api } from '../../../services/api/client';
import type {
  CompleteVisionBoardItemRequest,
  CreateVisionBoardItemRequest,
  CreateVisionBoardSectionRequest,
  MoveVisionBoardItemRequest,
  PinVisionBoardItemRequest,
  ReorderVisionBoardItemsRequest,
  ReorderVisionBoardSectionsRequest,
  UpdateVisionBoardItemRequest,
  UpdateVisionBoardSectionRequest,
  VisionBoardItemResponse,
  VisionBoardResponse,
  VisionBoardSectionResponse,
} from '../types/visionBoard.types';

export const visionBoardService = {
  // ── Board ───────────────────────────────────────────────────────────────────
  /** The whole board: ordered sections plus every active and completed item. */
  getBoard(): Promise<VisionBoardResponse> {
    return api.get<VisionBoardResponse>('/api/vision-board');
  },

  // ── Items ─────────────────────────────────────────────────────────────────
  getItem(itemId: string): Promise<VisionBoardItemResponse> {
    return api.get<VisionBoardItemResponse>(`/api/vision-board/items/${itemId}`);
  },

  createItem(payload: CreateVisionBoardItemRequest): Promise<VisionBoardItemResponse> {
    return api.post<VisionBoardItemResponse>('/api/vision-board/items', payload);
  },

  updateItem(
    itemId: string,
    payload: UpdateVisionBoardItemRequest,
  ): Promise<VisionBoardItemResponse> {
    return api.patch<VisionBoardItemResponse>(`/api/vision-board/items/${itemId}`, payload);
  },

  deleteItem(itemId: string): Promise<void> {
    return api.delete<void>(`/api/vision-board/items/${itemId}`);
  },

  /** Mark achieved, with an optional completion note. */
  completeItem(
    itemId: string,
    payload: CompleteVisionBoardItemRequest = {},
  ): Promise<VisionBoardItemResponse> {
    return api.post<VisionBoardItemResponse>(
      `/api/vision-board/items/${itemId}/complete`,
      payload,
    );
  },

  uncompleteItem(itemId: string): Promise<VisionBoardItemResponse> {
    return api.post<VisionBoardItemResponse>(`/api/vision-board/items/${itemId}/uncomplete`);
  },

  moveItem(
    itemId: string,
    payload: MoveVisionBoardItemRequest,
  ): Promise<VisionBoardItemResponse> {
    return api.post<VisionBoardItemResponse>(`/api/vision-board/items/${itemId}/move`, payload);
  },

  setPinned(itemId: string, isPinned: boolean): Promise<VisionBoardItemResponse> {
    const payload: PinVisionBoardItemRequest = { isPinned };
    return api.post<VisionBoardItemResponse>(`/api/vision-board/items/${itemId}/pin`, payload);
  },

  reorderItems(payload: ReorderVisionBoardItemsRequest): Promise<void> {
    return api.post<void>('/api/vision-board/items/reorder', payload);
  },

  // ── Sections ────────────────────────────────────────────────────────────────
  getSections(): Promise<VisionBoardSectionResponse[]> {
    return api.get<VisionBoardSectionResponse[]>('/api/vision-board/sections');
  },

  createSection(
    payload: CreateVisionBoardSectionRequest,
  ): Promise<VisionBoardSectionResponse> {
    return api.post<VisionBoardSectionResponse>('/api/vision-board/sections', payload);
  },

  updateSection(
    sectionId: string,
    payload: UpdateVisionBoardSectionRequest,
  ): Promise<VisionBoardSectionResponse> {
    return api.patch<VisionBoardSectionResponse>(
      `/api/vision-board/sections/${sectionId}`,
      payload,
    );
  },

  deleteSection(sectionId: string): Promise<void> {
    return api.delete<void>(`/api/vision-board/sections/${sectionId}`);
  },

  reorderSections(payload: ReorderVisionBoardSectionsRequest): Promise<void> {
    return api.post<void>('/api/vision-board/sections/reorder', payload);
  },
};
