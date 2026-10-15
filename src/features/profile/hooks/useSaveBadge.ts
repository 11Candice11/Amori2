/**
 * useSaveBadge — save a badge to the vault with the standard feedback.
 *
 * Shared by the badge reward modal and both badge grids (Vault, Achievements)
 * so they behave the same. The first save of a badge earns its points; the
 * server's `rewards` envelope updates the level badge on its own.
 *
 * The returned function rejects on failure (after showing the error), so a
 * modal can stay open for a retry.
 */
import { useCallback } from 'react';
import { getBadgeById } from '../../../constants/badges';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import { badgeService } from '../services/badgeService';

export function useSaveBadge(): (badgeId: string) => Promise<void> {
  return useCallback(async (badgeId: string) => {
    const alreadySaved = badgeService.isSaved(badgeId);
    try {
      await badgeService.archiveBadge(badgeId);
      const points = getBadgeById(badgeId)?.pointsReward;
      showSuccessOverlay(
        !alreadySaved && points ? `Badge saved · +${points} points` : 'Badge saved to your vault',
      );
    } catch (err) {
      console.error('Failed to save badge:', err);
      showErrorOverlay("Couldn't save the badge");
      throw err;
    }
  }, []);
}
