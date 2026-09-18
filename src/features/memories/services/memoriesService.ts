/**
 * memoriesService — thin wrapper over the shared API client for the
 * Memories feature (backend route base: /api/memories).
 */
import { api } from '../../../services/api/client';
import type {
  CreateMemoryRequest,
  MemoryResponse,
  UpdateMemoryRequest,
} from '../types/memory.types';

export const memoriesService = {
  /** All memories for the authenticated user's relationship (newest first). */
  getAll(): Promise<MemoryResponse[]> {
    return api.get<MemoryResponse[]>('/api/memories');
  },

  getById(memoryId: string): Promise<MemoryResponse> {
    return api.get<MemoryResponse>(`/api/memories/${memoryId}`);
  },

  create(payload: CreateMemoryRequest): Promise<MemoryResponse> {
    return api.post<MemoryResponse>('/api/memories', payload);
  },

  update(memoryId: string, payload: UpdateMemoryRequest): Promise<MemoryResponse> {
    return api.patch<MemoryResponse>(`/api/memories/${memoryId}`, payload);
  },

  remove(memoryId: string): Promise<void> {
    return api.delete<void>(`/api/memories/${memoryId}`);
  },

  favorite(memoryId: string): Promise<MemoryResponse> {
    return api.post<MemoryResponse>(`/api/memories/${memoryId}/favorite`);
  },

  unfavorite(memoryId: string): Promise<MemoryResponse> {
    return api.delete<MemoryResponse>(`/api/memories/${memoryId}/favorite`);
  },
};
