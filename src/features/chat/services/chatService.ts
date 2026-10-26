/**
 * Let's Chat API service. Wraps the backend /api/chat endpoints, following the
 * same singleton-object convention as incidentService. Enums travel as their
 * string names in both directions (the backend accepts either form).
 */
import { api } from '../../../services/api/client';
import type {
  ChatConversation,
  ChatTemplateDefinition,
  CreateChatPayload,
  ResolveChatPayload,
  UpdateChatPayload,
} from '../types/chat.types';

const BASE = '/api/chat';

export const chatService = {
  /** The catalog of guided templates and their ordered prompt steps. */
  getTemplates(): Promise<ChatTemplateDefinition[]> {
    return api.get<ChatTemplateDefinition[]>(`${BASE}/templates`);
  },

  /** The caller's own drafts plus every message exchanged with the partner. */
  getConversations(): Promise<ChatConversation[]> {
    return api.get<ChatConversation[]>(BASE);
  },

  getConversation(id: string): Promise<ChatConversation> {
    return api.get<ChatConversation>(`${BASE}/${id}`);
  },

  create(payload: CreateChatPayload): Promise<ChatConversation> {
    return api.post<ChatConversation>(BASE, {
      templateType: payload.templateType,
      answers: payload.answers,
      composedMessage: payload.composedMessage ?? null,
    });
  },

  update(id: string, payload: UpdateChatPayload): Promise<ChatConversation> {
    return api.patch<ChatConversation>(`${BASE}/${id}`, {
      answers: payload.answers ?? null,
      composedMessage: payload.composedMessage ?? null,
      status: payload.status ?? null,
    });
  },

  send(id: string): Promise<ChatConversation> {
    return api.post<ChatConversation>(`${BASE}/${id}/send`);
  },

  markRead(id: string): Promise<ChatConversation> {
    return api.post<ChatConversation>(`${BASE}/${id}/read`);
  },

  /** Close a sent chat with a written resolution. Either partner may do this. */
  resolve(id: string, resolution: string): Promise<ChatConversation> {
    const payload: ResolveChatPayload = { resolution };
    return api.post<ChatConversation>(`${BASE}/${id}/resolve`, payload);
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(`${BASE}/${id}`);
  },
};
