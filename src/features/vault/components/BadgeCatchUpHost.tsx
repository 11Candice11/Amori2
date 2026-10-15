/**
 * BadgeCatchUpHost — runs the one-off catch-up when a signed-in session starts,
 * and shows the "already earned" summary when there's something to tell.
 *
 * Mounted once in App.tsx for authenticated sessions. On mount it calls
 * POST /api/users/me/catch-up, which credits points for past activity exactly
 * once per user (the response's `rewards` updates the level badge by itself).
 * Only on that first run does it look for earned-but-unsaved badges and open
 * BadgeCatchUpModal. Every later launch is a cheap no-op.
 *
 * If the call fails (offline), nothing is shown and the next launch tries
 * again — the server hasn't recorded the run, so it's still the "first" one.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { pointsService, type BackfillLine } from '../../../services/api/pointsService';
import { badgeService } from '../../profile/services/badgeService';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import type { Badge } from '../../../constants/badges';
import { BadgeCatchUpModal } from './BadgeCatchUpModal';

export function BadgeCatchUpHost() {
  const ran = useRef(false);
  const [visible, setVisible] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [backfill, setBackfill] = useState<BackfillLine[]>([]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    let alive = true;

    (async () => {
      try {
        const result = await pointsService.catchUp();
        if (!result.firstRun) return;

        // Unlock state depends on fresh counters (and the level the backfill
        // just raised), so re-read before deciding what's left to save.
        await badgeService.refresh();
        const unsaved = badgeService.getUnsavedEarned();
        const lines = result.breakdown ?? [];

        if (!alive || (unsaved.length === 0 && lines.length === 0)) return;
        setBadges(unsaved);
        setBackfill(lines);
        setVisible(true);
      } catch (err) {
        console.warn('Badge catch-up failed; will retry next launch:', err);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const handleSaveAll = useCallback(async () => {
    try {
      const skipped = await badgeService.archiveMany(badges.map(b => b.id));
      const saved = badges.filter(b => !skipped.includes(b.id));
      const points = saved.reduce((sum, b) => sum + b.pointsReward, 0);
      showSuccessOverlay(
        saved.length === 1
          ? `Badge saved · +${points} points`
          : `${saved.length} badges saved · +${points} points`,
      );
      setVisible(false);
    } catch (err) {
      console.error('Failed to save badges:', err);
      showErrorOverlay("Couldn't save your badges");
      throw err;
    }
  }, [badges]);

  const handleDismiss = useCallback(() => setVisible(false), []);

  if (!visible) return null;

  return (
    <BadgeCatchUpModal
      visible={visible}
      badges={badges}
      backfill={backfill}
      onSaveAll={handleSaveAll}
      onDismiss={handleDismiss}
    />
  );
}
