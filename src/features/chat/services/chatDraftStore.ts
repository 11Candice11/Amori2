/**
 * chatDraftStore — device-local persistence for in-progress Let's Chat drafts.
 *
 * A draft must survive navigation away, app backgrounding, and a full app
 * restart. The server holds the authoritative draft (POST/PATCH /api/chat),
 * but a purely-local mirror in AsyncStorage means an in-progress composition is
 * never lost even if the device is offline or the server draft hasn't been
 * created yet. Follows the same on-device pattern as customTriggerStore.
 *
 * Drafts are inherently private — they live only on this device under the
 * signed-in user's session and are never sent anywhere until the user chooses
 * to send. Cleared on sign-out via reset().
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatAnswers, ChatTemplateType } from '../types/chat.types';

const STORAGE_KEY = '@amori:chat:drafts';

/** A locally-persisted draft. `serverId` links it to the backend row once created. */
export interface LocalChatDraft {
  /** Stable local id (also the map key). */
  localId: string;
  /** The backend conversation id once it has been created/patched, else null. */
  serverId: string | null;
  templateType: ChatTemplateType;
  answers: ChatAnswers;
  /** Which step the user was on, so the flow resumes where they left off. */
  stepIndex: number;
  updatedAt: string;
}

type DraftMap = Record<string, LocalChatDraft>;

function isValidDraft(value: unknown): value is LocalChatDraft {
  if (!value || typeof value !== 'object') return false;
  const d = value as Partial<LocalChatDraft>;
  return (
    typeof d.localId === 'string' &&
    typeof d.templateType === 'string' &&
    typeof d.answers === 'object' &&
    d.answers !== null
  );
}

async function loadMap(): Promise<DraftMap> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return {};
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return {};
    const result: DraftMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isValidDraft(value)) result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

async function saveMap(map: DraftMap): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to persist chat drafts:', err);
  }
}

export const chatDraftStore = {
  /** All local drafts, newest first. */
  async getAll(): Promise<LocalChatDraft[]> {
    const map = await loadMap();
    return Object.values(map).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  },

  async get(localId: string): Promise<LocalChatDraft | null> {
    const map = await loadMap();
    return map[localId] ?? null;
  },

  /** Find the local mirror of a server conversation, if one exists on this device. */
  async findByServerId(serverId: string): Promise<LocalChatDraft | null> {
    const map = await loadMap();
    return Object.values(map).find((d) => d.serverId === serverId) ?? null;
  },

  /** Create or overwrite a draft, stamping updatedAt. */
  async save(draft: Omit<LocalChatDraft, 'updatedAt'>): Promise<LocalChatDraft> {
    const map = await loadMap();
    const stored: LocalChatDraft = { ...draft, updatedAt: new Date().toISOString() };
    map[draft.localId] = stored;
    await saveMap(map);
    return stored;
  },

  async remove(localId: string): Promise<void> {
    const map = await loadMap();
    if (map[localId]) {
      delete map[localId];
      await saveMap(map);
    }
  },

  /** Drop every local draft. Used on sign-out. */
  async reset(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to reset chat drafts:', err);
    }
  },
};

/** Generate a stable local draft id. */
export function newLocalDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
