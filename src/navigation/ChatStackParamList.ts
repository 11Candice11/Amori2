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
  /**
   * One chat, whether you sent it or received it (also the push / inbox target).
   * Open chats offer Resolve; resolved chats show the resolution.
   */
  ChatDetail: { conversationId: string };
  /** Ask for a resolution and close the chat. */
  ChatResolve: { conversationId: string };
  /** Saved (unsent) drafts. */
  ChatDrafts: undefined;
  /** Open chats: sent messages that haven't been resolved yet. */
  ChatList: undefined;
  /** Chats either partner has resolved. */
  ChatResolved: undefined;
};
