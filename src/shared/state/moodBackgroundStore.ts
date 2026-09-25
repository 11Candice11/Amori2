/**
 * moodBackgroundStore — the single source of truth for the mood-driven
 * background shared by the Check-in, Together and Desk screens.
 *
 * Those three screens must show the *same* image, so both the quadrant and the
 * variant (each quadrant has two images) are held here instead of each screen
 * rolling its own. The variant is only re-rolled when the quadrant actually
 * changes, so moving between the three tabs never swaps the image — but a new
 * check-in does.
 *
 * Home, settings and sign-in are deliberately not part of this: they have their
 * own dedicated artwork.
 */
import { useEffect, useState } from 'react';

import { useDayChange } from '../../hooks/useDayChange';
import { moodService } from '../../features/mood/services/moodService';
import { quadrantFromCheckIn, type MoodQuadrant } from '../../features/mood/types/mood.types';
import type { CheckInResponse } from '../../services/api/types';
import {
  randomBackgroundVariant,
  resolveMoodBackground,
  type BackgroundVariant,
} from '../../utils/backgroundImages';

type Listener = () => void;

/** null = no check-in today, which resolves to a neutral background. */
let currentQuadrant: MoodQuadrant | null = null;
let currentVariant: BackgroundVariant = randomBackgroundVariant();
let hasLoaded = false;
let inFlight: Promise<void> | null = null;

const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach(listener => listener());
}

/** True when the ISO timestamp falls on the current calendar day. */
function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export const moodBackgroundStore = {
  /** The image every mood-driven screen should render right now. */
  getImage(): number {
    return resolveMoodBackground(currentQuadrant, currentVariant);
  },

  /** Today's quadrant, or null when there's no check-in today. */
  getQuadrant(): MoodQuadrant | null {
    return currentQuadrant;
  },

  /**
   * Set the quadrant. Re-rolls the variant only on an actual change, so the
   * image stays put while the user moves between screens.
   */
  setQuadrant(quadrant: MoodQuadrant | null): void {
    hasLoaded = true;
    if (quadrant === currentQuadrant) return;
    currentQuadrant = quadrant;
    currentVariant = randomBackgroundVariant();
    notify();
  },

  /**
   * Derive the quadrant from a check-in response. Anything older than today
   * counts as no check-in, matching what the dashboard considers "today".
   */
  setFromCheckIn(checkIn: CheckInResponse | null): void {
    if (!checkIn || !isToday(checkIn.createdAt)) {
      this.setQuadrant(null);
      return;
    }
    this.setQuadrant(quadrantFromCheckIn(checkIn.feelings, checkIn.mood));
  },

  /**
   * Fetch today's check-in once per app session. Concurrent callers share the
   * same request; already-loaded state resolves immediately. Pass force to
   * re-fetch (e.g. a pull-to-refresh).
   */
  load(force = false): Promise<void> {
    if (!force && hasLoaded) return Promise.resolve();
    if (inFlight) return inFlight;

    inFlight = moodService
      .getCurrent()
      .then(current => {
        moodBackgroundStore.setFromCheckIn(current);
      })
      .catch(() => {
        // Offline or the call failed — stay on neutral rather than blocking.
        moodBackgroundStore.setQuadrant(null);
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Test seam — drops cached state so each test starts clean. */
  reset(): void {
    currentQuadrant = null;
    currentVariant = randomBackgroundVariant();
    hasLoaded = false;
    inFlight = null;
  },
};

/**
 * Subscribe a screen to the shared mood background. Triggers the one-time load
 * on first mount and re-renders whenever the mood changes.
 */
export function useMoodBackground(): number {
  const [image, setImage] = useState(() => moodBackgroundStore.getImage());

  useEffect(() => {
    const unsubscribe = moodBackgroundStore.subscribe(() => {
      setImage(moodBackgroundStore.getImage());
    });
    // Picks up today's check-in the first time any mood-driven screen mounts.
    moodBackgroundStore.load();
    return unsubscribe;
  }, []);

  // When the local day rolls over, yesterday's mood no longer applies — re-fetch
  // so the shared background falls back to neutral until a fresh check-in.
  useDayChange(() => {
    moodBackgroundStore.load(true);
  });

  return image;
}
