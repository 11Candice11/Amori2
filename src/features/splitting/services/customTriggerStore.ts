/**
 * customTriggerStore — persists the trigger options a person adds themselves on
 * the grounding checkpoint, so their own words are waiting for them next time.
 *
 * TEMPORARY: the backend has no trigger catalogue (SplittingSession only stores
 * the chosen feelings per session), so these live in AsyncStorage on-device,
 * following the same pattern as vaultService. If/when a
 * /api/splitting/triggers endpoint lands, swap the load/save internals and the
 * public surface below can stay as-is.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TriggerGroup, TriggerOption } from '../types/splitting.types';
import { TRIGGER_OPTIONS } from '../utils/splittingData';

const CUSTOM_TRIGGERS_STORAGE_KEY = '@amori:splitting:custom_triggers';

/** Normalised form used for duplicate detection ("Work stress" == "work  stress"). */
function normalise(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Keep only well-formed entries — storage can outlive a shape change. */
function isValidTrigger(value: unknown): value is TriggerOption {
  if (!value || typeof value !== 'object') return false;
  const t = value as Partial<TriggerOption>;
  return (
    typeof t.id === 'string' &&
    typeof t.label === 'string' &&
    t.label.trim().length > 0 &&
    (t.group === 'physical' || t.group === 'emotional' || t.group === 'relational')
  );
}

async function loadFromStorage(): Promise<TriggerOption[]> {
  try {
    const json = await AsyncStorage.getItem(CUSTOM_TRIGGERS_STORAGE_KEY);
    if (!json) return [];
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTrigger);
  } catch {
    return [];
  }
}

async function saveToStorage(triggers: TriggerOption[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CUSTOM_TRIGGERS_STORAGE_KEY, JSON.stringify(triggers));
  } catch (err) {
    console.error('Failed to save custom triggers to storage:', err);
  }
}

export const customTriggerStore = {
  /** All saved custom triggers, oldest first so the list stays stable. */
  getAll(): Promise<TriggerOption[]> {
    return loadFromStorage();
  },

  /**
   * Add a custom trigger. Returns the stored option — if the label already
   * exists (as a custom trigger or a built-in one) the existing option is
   * returned instead of creating a duplicate, so selecting it still works.
   */
  async add(label: string, group: TriggerGroup): Promise<TriggerOption | null> {
    const trimmed = label.trim();
    if (!trimmed) return null;
    const key = normalise(trimmed);

    // Don't shadow a built-in trigger with an identical custom one.
    const builtIn = TRIGGER_OPTIONS.find(o => normalise(o.label) === key);
    if (builtIn) return builtIn;

    const triggers = await loadFromStorage();
    const existing = triggers.find(t => normalise(t.label) === key);
    if (existing) return existing;

    const created: TriggerOption = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      label: trimmed,
      group,
    };

    await saveToStorage([...triggers, created]);
    return created;
  },

  /** Remove a saved custom trigger by id. */
  async remove(triggerId: string): Promise<void> {
    const triggers = await loadFromStorage();
    await saveToStorage(triggers.filter(t => t.id !== triggerId));
  },
};
