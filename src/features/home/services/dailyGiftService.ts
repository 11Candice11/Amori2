/**
 * dailyGiftService — picks a random memory for the daily artifact.
 *
 * The daily gift/surprise is a randomly selected memory from the couple's
 * shared memories collection, paired with a random card (1-10).
 *
 * Two rules shape the pick:
 *   1. It changes every morning — the same memory shouldn't show up on
 *      consecutive days (see dailyGiftStore's recent history).
 *   2. It's a memory the user hasn't already kept — anything already in their
 *      vault is excluded, so a gift is always something new to save.
 */
import { memoriesService } from '../../memories/services/memoriesService';
import type { MemoryResponse } from '../../memories/types/memory.types';
import { vaultService } from '../../vault/services/vaultService';
import { dailyGiftStore } from './dailyGiftStore';

/** The number of collectible card designs (card1.png … card10.png). */
const CARD_COUNT = 10;

/**
 * Represents a daily gift with memory content formatted for display.
 */
export interface DailyGift {
  /** The memory that was randomly selected */
  memory: MemoryResponse;
  /** Formatted title for display */
  title: string;
  /** Formatted body text for display */
  body: string;
  /** The card number (1-10) for this gift */
  cardNumber: number;
}

/** Pick a uniformly random element of a non-empty array. */
function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Format a memory as a daily gift with appropriate title and body text.
 *
 * `cardNumber` is passed in (not rolled here) so it stays stable for the whole
 * day: the card the user tears open must be the exact card that lands in their
 * vault when they save it.
 */
function formatMemoryAsGift(memory: MemoryResponse, cardNumber: number): DailyGift {
  const memoryDate = new Date(memory.memoryDateTime);
  const formattedDate = memoryDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let title = memory.title;
  let body = '';

  // If there's a description, use it
  if (memory.description) {
    body = memory.description;
  }

  // Add location if available
  if (memory.location) {
    body = body ? `${body}\n\n📍 ${memory.location}` : `📍 ${memory.location}`;
  }

  // Add the memory date
  body = body ? `${body}\n\n🗓 ${formattedDate}` : `🗓 ${formattedDate}`;

  // Add who created it
  body = `${body}\n\n— ${memory.createdByName}`;

  return {
    memory,
    title,
    body,
    cardNumber,
  };
}

/**
 * Choose which memories are eligible to be today's gift.
 *
 * Excludes anything already saved in the vault (a gift should always be new to
 * keep) and, when possible, anything gifted in the last few days (so the gift
 * changes every morning). The recent-history filter is relaxed first if it
 * would leave nothing, and the vault filter is only relaxed as a last resort so
 * the user still gets a gift when they've already saved most of their memories.
 */
function chooseEligible(
  memories: MemoryResponse[],
  savedMemoryIds: Set<string>,
  recentMemoryIds: string[],
): MemoryResponse[] {
  const notSaved = memories.filter((m) => !savedMemoryIds.has(m.id));
  // Everything's already in the vault — fall back to the full list so there's
  // still something to reveal (it just won't be re-savable).
  const base = notSaved.length > 0 ? notSaved : memories;

  const recent = new Set(recentMemoryIds);
  const fresh = base.filter((m) => !recent.has(m.id));
  // If avoiding recent repeats would leave nothing, allow repeats rather than
  // show no gift.
  return fresh.length > 0 ? fresh : base;
}

export const dailyGiftService = {
  /**
   * Get today's daily gift.
   *
   * The gift is pinned per calendar day: the first time it's requested today we
   * pick a random eligible memory + card and persist them, then every later
   * request (dashboard, High-Pleasant check-in, vault save) reads back the exact
   * same gift so it's identical everywhere it's shown that day. The pick itself
   * is genuinely random — a fresh memory each morning — rather than derived from
   * the date, which previously produced the same gift on consecutive days.
   *
   * Returns null if there are no memories to choose from.
   */
  async getTodaysGift(): Promise<DailyGift | null> {
    try {
      // Fetch all memories.
      const memories = await memoriesService.getAll();

      if (memories.length === 0) {
        return null;
      }

      // If today's gift was already pinned and the memory still exists, reuse it
      // so the gift is identical everywhere it's shown today.
      const stored = await dailyGiftStore.getTodaysSelection();
      if (stored) {
        const pinned = memories.find((m) => m.id === stored.memoryId);
        if (pinned) {
          return formatMemoryAsGift(pinned, stored.cardNumber);
        }
        // The pinned memory is gone (deleted). Fall through to re-roll and
        // re-pin so the user still gets a gift today.
      }

      // Figure out which memories are already in the vault and which were
      // gifted recently, so we can hand out something new and different.
      const [savedGifts, recentMemoryIds] = await Promise.all([
        vaultService.getAll().catch(() => []),
        dailyGiftStore.getRecentMemoryIds(),
      ]);
      const savedMemoryIds = new Set(savedGifts.map((g) => g.memoryId));

      const eligible = chooseEligible(memories, savedMemoryIds, recentMemoryIds);
      const selectedMemory = pickRandom(eligible);
      const cardNumber = Math.floor(Math.random() * CARD_COUNT) + 1;

      // Pin the selection so subsequent viewings return this same gift, and
      // record it so tomorrow's pick avoids repeating it.
      await Promise.all([
        dailyGiftStore.setTodaysSelection(selectedMemory.id, cardNumber),
        dailyGiftStore.recordGiftedMemory(selectedMemory.id),
      ]);

      return formatMemoryAsGift(selectedMemory, cardNumber);
    } catch (error) {
      console.error('Failed to get daily gift:', error);
      return null;
    }
  },
};
