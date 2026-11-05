/**
 * Let's Chat types — mirror the C# DTOs/enums exactly. The backend serializes
 * enums as their string names (global JsonStringEnumConverter), so these are
 * string unions, not numbers. Do not invent values; they must match the API.
 */

// ─── Enums (string names, matching the backend) ─────────────────────────────

/** Guided sentence templates. Matches Domain/Enums/ChatTemplateType. */
export type ChatTemplateType =
  | 'Feeling'
  | 'Appreciation'
  | 'Need'
  | 'SomethingBotheredMe'
  | 'SomethingOnMyMind'
  | 'Future';

/** Every template type, in the order they're offered on the list screen. */
export const CHAT_TEMPLATE_ORDER: readonly ChatTemplateType[] = [
  'Feeling',
  'Appreciation',
  'Need',
  'SomethingBotheredMe',
  'SomethingOnMyMind',
  'Future',
];

/** Conversation lifecycle. Matches Domain/Enums/ChatMessageStatus. */
export type ChatMessageStatus = 'Draft' | 'Sent' | 'Delivered' | 'Read' | 'Private';

/** The two statuses that keep a message private to its author. */
export const PRIVATE_CHAT_STATUSES: readonly ChatMessageStatus[] = ['Draft', 'Private'];

export function isPrivateChatStatus(status: ChatMessageStatus): boolean {
  return PRIVATE_CHAT_STATUSES.includes(status);
}

/** A status that has been delivered to the partner (visible to both). */
export function isSentChatStatus(status: ChatMessageStatus): boolean {
  return !isPrivateChatStatus(status);
}

// ─── Template definitions (served from GET /api/chat/templates) ──────────────

export interface ChatTemplateStep {
  input: string;
  label: string;
  /** Sentence fragment shown before the answer, e.g. "I feel". */
  prefix: string;
  placeholder?: string | null;
  required: boolean;
  multiline: boolean;
}

export interface ChatTemplateDefinition {
  type: ChatTemplateType;
  title: string;
  description: string;
  steps: ChatTemplateStep[];
}

// ─── Conversation (GET/POST/PATCH responses) ─────────────────────────────────

/** Map of template input key → answer text. */
export type ChatAnswers = Record<string, string>;

export interface ChatConversation {
  id: string;
  relationshipId: string;
  senderId: string;
  senderName: string;
  recipientId: string | null;
  templateType: ChatTemplateType;
  status: ChatMessageStatus;
  answers: ChatAnswers;
  composedMessage: string;
  isPrivate: boolean;
  /** True for the caller's own messages — gates edit/delete in the UI. */
  isMine: boolean;
  sentAt: string | null;
  readAt: string | null;
  /** True once either partner has resolved (closed) the chat. */
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedById: string | null;
  resolvedByName: string | null;
  /** What the resolver wrote when closing the chat. */
  resolution: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// ─── Request payloads ────────────────────────────────────────────────────────

export interface CreateChatPayload {
  templateType: ChatTemplateType;
  answers: ChatAnswers;
  composedMessage?: string;
}

export interface UpdateChatPayload {
  answers?: ChatAnswers;
  composedMessage?: string;
  status?: ChatMessageStatus;
}

/** Matches ResolveChatRequest on the server. */
export interface ResolveChatPayload {
  resolution: string;
}

/** Longest resolution the server accepts (ChatConversation.ResolutionMaxLength). */
export const CHAT_RESOLUTION_MAX_LENGTH = 4000;

// ─── Partner response shortcuts (convenience actions, not required) ──────────

export interface ChatResponseShortcut {
  key: string;
  label: string;
}

export const CHAT_RESPONSE_SHORTCUTS: readonly ChatResponseShortcut[] = [
  { key: 'hear_you', label: 'I hear you' },
  { key: 'thank_you', label: 'Thank you for telling me' },
  { key: 'understand', label: 'I understand' },
  { key: 'tell_more', label: 'Tell me more' },
];
