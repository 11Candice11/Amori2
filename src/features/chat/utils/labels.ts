/**
 * Display labels for template types and statuses. Kept separate from the
 * type definitions so both components and screens share one source of truth.
 */
import type { ChatConversation, ChatTemplateType } from '../types/chat.types';

export const TEMPLATE_TITLES: Record<ChatTemplateType, string> = {
  Feeling: "Something I'm feeling",
  Appreciation: 'Something I appreciate',
  Need: 'Something I need',
  SomethingBotheredMe: 'Something that bothered me',
  SomethingOnMyMind: 'Just something on my mind',
  Future: 'Something about our future',
};

/** A short, human status label for a conversation. */
export function statusLabel(conversation: ChatConversation): string {
  switch (conversation.status) {
    case 'Draft':
      return 'Draft';
    case 'Private':
      return 'Saved privately';
    case 'Sent':
    case 'Delivered':
      return conversation.isMine ? 'Sent' : 'Received';
    case 'Read':
      return conversation.isMine ? 'Read' : 'Received';
    default:
      return conversation.status;
  }
}

/** Compact relative time, e.g. "24m ago", "3h ago", "2d ago". */
export function relativeTimeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMin = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
