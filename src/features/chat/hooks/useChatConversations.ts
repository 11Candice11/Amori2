import { useCallback, useEffect, useState } from 'react';
import { chatService } from '../services/chatService';
import type { ChatConversation } from '../types/chat.types';
import { isSentChatStatus } from '../types/chat.types';

/**
 * Loads the caller's conversations (own drafts + all messages exchanged with
 * the partner). The server already excludes the partner's private drafts, so
 * the list is safe to render as-is.
 */
export function useChatConversations() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConversations(await chatService.getConversations());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { conversations, loading, error, refresh: load };
}

/** Partition helper: drafts (mine + private/draft) vs the shared thread. */
export function partitionConversations(items: ChatConversation[]) {
  const drafts = items.filter((c) => c.isMine && !isSentChatStatus(c.status));
  const thread = items.filter((c) => isSentChatStatus(c.status));
  return { drafts, thread };
}
