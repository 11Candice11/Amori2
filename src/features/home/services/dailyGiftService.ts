/**
 * dailyGiftService — picks a random memory for the daily artifact.
 *
 * The daily gift/surprise is a randomly selected memory from the couple's
 * shared memories collection, paired with a random card from the deck.
 *
 * Two rules shape the pick:
 *   1. It changes every morning — the same memory shouldn't show up on
 *      consecutive days (see dailyGiftStore's recent history).
 *   2. It's a memory the user hasn't already kept — anything already in their
 *      vault is excluded, so a gift is always something new to save.
 */
import { memoriesService } from '../../memories/services/memoriesService';
import type { MemoryResponse } from '../../memories/types/memory.types';
import { visionBoardService } from '../../together/services/visionBoardService';
import type { VisionBoardItemResponse } from '../../together/types/visionBoard.types';
import { vaultService } from '../../vault/services/vaultService';
import { getRandomCardNumber } from '../../../utils/cardSelector';
import { dailyGiftStore } from './dailyGiftStore';

/**
 * Represents a daily gift with memory or vision board content formatted for display.
 */
export interface DailyGift {
  /** The type of gift - either a memory or a vision */
  type: 'memory' | 'vision';
  /** The memory that was randomly selected (present when type === 'memory') */
  memory?: MemoryResponse;
  /** The vision board item that was randomly selected (present when type === 'vision') */
  vision?: VisionBoardItemResponse;
  /** Formatted title for display */
  title: string;
  /** Formatted body text for display */
  body: string;
  /** The card number for this gift (any card in the deck) */
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
    type: 'memory',
    memory,
    title,
    body,
    cardNumber,
  };
}

/**
 * Format a vision board item as a daily gift with appropriate title and body text.
 *
 * `cardNumber` is passed in (not rolled here) so it stays stable for the whole
 * day: the card the user tears open must be the exact card that lands in their
 * vault when they save it.
 */
function formatVisionAsGift(vision: VisionBoardItemResponse, cardNumber: number): DailyGift {
  let title = vision.title;
  let body = '';

  // Add description if available
  if (vision.description) {
    body = vision.description;
  }

  // Add location if available
  if (vision.locationName) {
    body = body ? `${body}\n\n📍 ${vision.locationName}` : `📍 ${vision.locationName}`;
  }

  // Add target date if available
  if (vision.targetDate) {
    const targetDate = new Date(vision.targetDate);
    const formattedDate = targetDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    body = body ? `${body}\n\n🎯 ${formattedDate}` : `🎯 ${formattedDate}`;
  }

  // Add budget if available
  if (vision.budget !== null && vision.budget !== undefined) {
    const formattedBudget = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(vision.budget);
    body = body ? `${body}\n\n💰 ${formattedBudget}` : `💰 ${formattedBudget}`;
  }

  // Add notes if available
  if (vision.notes) {
    body = body ? `${body}\n\n${vision.notes}` : vision.notes;
  }

  // Add who created it
  body = `${body}\n\n— ${vision.createdByName}`;

  return {
    type: 'vision',
    vision,
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
   * pick a random eligible memory or vision + card and persist them, then every later
   * request (dashboard, High-Pleasant check-in, vault save) reads back the exact
   * same gift so it's identical everywhere it's shown that day. The pick itself
   * is genuinely random — a fresh memory or vision each morning — rather than derived from
   * the date, which previously produced the same gift on consecutive days.
   *
   * Returns null if there are no memories or visions to choose from.
   */
  async getTodaysGift(): Promise<DailyGift | null> {
    try {
      // Fetch both memories and vision board items in parallel
      const [memoriesResult, visionBoardResult] = await Promise.allSettled([
        memoriesService.getAll(),
        visionBoardService.getBoard(),
      ]);

      const memories = memoriesResult.status === 'fulfilled' ? memoriesResult.value : [];
      const visionItems =
        visionBoardResult.status === 'fulfilled'
          ? visionBoardResult.value.items.filter((item) => !item.isCompleted)
          : [];

      // If we have nothing to gift, return null
      if (memories.length === 0 && visionItems.length === 0) {
        return null;
      }

      // If today's gift was already pinned and the item still exists, reuse it
      // so the gift is identical everywhere it's shown today.
      const stored = await dailyGiftStore.getTodaysSelection();
      if (stored) {
        if (stored.type === 'memory') {
          const pinned = memories.find((m) => m.id === stored.memoryId);
          if (pinned) {
            return formatMemoryAsGift(pinned, stored.cardNumber);
          }
        } else if (stored.type === 'vision' && stored.visionId) {
          const pinned = visionItems.find((v) => v.id === stored.visionId);
          if (pinned) {
            return formatVisionAsGift(pinned, stored.cardNumber);
          }
        }
        // The pinned item is gone (deleted or completed). Fall through to re-roll and
        // re-pin so the user still gets a gift today.
      }

      // Figure out which memories are already in the vault and which were
      // gifted recently, so we can hand out something new and different.
      const [savedGifts, recentMemoryIds] = await Promise.all([
        vaultService.getAll().catch(() => []),
        dailyGiftStore.getRecentMemoryIds(),
      ]);
      const isId = (id: string | null): id is string => !!id;
      const savedMemoryIds = new Set(savedGifts.map((g) => g.memoryId).filter(isId));
      const savedVisionIds = new Set(savedGifts.map((g) => g.visionBoardItemId).filter(isId));

      const eligibleMemories = chooseEligible(memories, savedMemoryIds, recentMemoryIds);
      const eligibleVisions = visionItems.filter((v) => !savedVisionIds.has(v.id));

      // Randomly decide whether to gift a memory or a vision
      // Only choose from what's available
      const hasMemories = eligibleMemories.length > 0;
      const hasVisions = eligibleVisions.length > 0;

      let giftType: 'memory' | 'vision';
      if (hasMemories && hasVisions) {
        // Both available, randomly pick one type
        giftType = Math.random() < 0.5 ? 'memory' : 'vision';
      } else if (hasMemories) {
        giftType = 'memory';
      } else if (hasVisions) {
        giftType = 'vision';
      } else {
        return null; // Nothing eligible to gift
      }

      // Any card in the deck. The server accepts 1..its CardCount, which has to
      // stay in step with the deck (see VaultService.CardCount).
      const cardNumber = getRandomCardNumber();

      if (giftType === 'memory') {
        const selectedMemory = pickRandom(eligibleMemories);
        // Pin the selection so subsequent viewings return this same gift, and
        // record it so tomorrow's pick avoids repeating it.
        await Promise.all([
          dailyGiftStore.setTodaysSelection(selectedMemory.id, cardNumber, 'memory'),
          dailyGiftStore.recordGiftedMemory(selectedMemory.id),
        ]);
        return formatMemoryAsGift(selectedMemory, cardNumber);
      } else {
        const selectedVision = pickRandom(eligibleVisions);
        // Pin the selection so subsequent viewings return this same gift
        await dailyGiftStore.setTodaysSelection(selectedVision.id, cardNumber, 'vision');
        return formatVisionAsGift(selectedVision, cardNumber);
      }
    } catch (error) {
      console.error('Failed to get daily gift:', error);
      return null;
    }
  },
};
