import type { ChatTemplateType } from '../features/chat/types/chat.types';

export type ChatStackParamList = {
  /** Template picker + conversation starters (the Let's Chat home). */
  ChatHome: undefined;
  /** The guided step-by-step composition flow. */
  ChatCompose: {
    templateType: ChatTemplateType;
    /** Resume an existing local draft, if any. */
    localDraftId?: string;
    /** Resume an existing server conversation, if any. */
    conversationId?: string;
  };
  /** The full-message preview shown before sending. */
  ChatPreview: { localDraftId: string };
  /** Post-send confirmation ("Sent with love"). */
  ChatSent: { conversationId: string };
  /** A message received from the partner. */
  ChatReceived: { conversationId: string };
  /** Saved (unsent) drafts. */
  ChatDrafts: undefined;
  /** The shared archive of exchanged messages. */
  ChatHistory: undefined;
};
