/**
 * useDashboard — aggregates the data the Home dashboard needs.
 *
 * Fetches the current user, their relationship, and today's mood check-in
 * in parallel, degrading gracefully if any single call fails.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../services/api/client';
import { authService } from '../../../services/auth/authService';
import { moodService } from '../../mood/services/moodService';
import { settingsService } from '../../profile/services/settingsService';
import { splittingService } from '../../splitting/services/splittingService';
import type { RelationshipResponse } from '../../../services/api/types';
import type { RhythmItem } from '../components/GentleRhythm';

export interface DashboardCurrentMood {
  /** Backend MoodType label, e.g. "Anxious" */
  mood: string;
  /** Human-readable feelings label the user chose, if any */
  feelings: string | null;
}

export interface DashboardPartnerMood {
  /** Backend MoodType label, e.g. "Calm" */
  mood: string;
  /** Human-readable feelings label the partner chose, if any */
  feelings: string | null;
  /** ISO timestamp of the partner's check-in */
  createdAt: string;
}

export interface DashboardSpaceWindow {
  /** Whose window this is — the current user's own, or the partner's. */
  owner: 'self' | 'partner';
  /** ISO timestamp when the self-regulation window ends. */
  spaceEndsAt: string;
}

export interface DashboardData {
  userName: string;
  partnerName: string;
  isPartnerOnline: boolean;
  relationshipDays: number;
  rhythmItems: RhythmItem[];
  hasMoodToday: boolean;
  currentMood: DashboardCurrentMood | null;
  partnerMood: DashboardPartnerMood | null;
  /**
   * The active grounding self-regulation window to show, if any. Prefers the
   * user's own window; falls back to the partner's. Both partners see a
   * countdown this way.
   */
  spaceWindow: DashboardSpaceWindow | null;
  loading: boolean;
  error: string | null;
}

const INITIAL: DashboardData = {
  userName: '',
  partnerName: '',
  isPartnerOnline: false,
  relationshipDays: 0,
  rhythmItems: [],
  hasMoodToday: false,
  currentMood: null,
  partnerMood: null,
  spaceWindow: null,
  loading: true,
  error: null,
};

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return 0;
  const diffMs = Date.now() - start;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

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

export function useDashboard(): DashboardData & { refresh: () => void } {
  const [data, setData] = useState<DashboardData>(INITIAL);

  const load = useCallback(async () => {
    setData(d => ({ ...d, loading: true, error: null }));

    const [
      meResult,
      relResult,
      moodResult,
      partnerMoodResult,
      partnerStatusResult,
      partnerWindowResult,
      myWindowResult,
    ] = await Promise.allSettled([
      authService.getMe(),
      api.get<RelationshipResponse>('/api/relationships/me'),
      moodService.getCurrent(),
      moodService.getPartnerCurrent(),
      settingsService.getPartnerStatus(),
      splittingService.getPartnerActive(),
      splittingService.getMyActive(),
    ]);

    // Current user's display name (for the "You & <partner>" greeting).
    const userName =
      meResult.status === 'fulfilled' ? meResult.value.name ?? '' : '';

    // Partner name: the relationship member that isn't the current user
    let partnerName = '';
    let relationshipDays = 0;
    if (relResult.status === 'fulfilled' && relResult.value) {
      const rel = relResult.value;
      relationshipDays = daysSince(rel.startDate);
      const myId = meResult.status === 'fulfilled' ? meResult.value.id : null;
      const partner = rel.members?.find(m => m.id !== myId) ?? rel.members?.[0];
      partnerName = partner?.name ?? '';
    }

    // Mood
    let currentMood: DashboardCurrentMood | null = null;
    let hasMoodToday = false;
    if (moodResult.status === 'fulfilled' && moodResult.value) {
      const checkIn = moodResult.value;
      currentMood = { mood: String(checkIn.mood), feelings: checkIn.feelings };
      hasMoodToday = isToday(checkIn.createdAt);
    }

    // Partner mood (only their most recent shared check-in)
    let partnerMood: DashboardPartnerMood | null = null;
    if (partnerMoodResult.status === 'fulfilled' && partnerMoodResult.value) {
      const pc = partnerMoodResult.value;
      partnerMood = {
        mood: String(pc.mood),
        feelings: pc.feelings,
        createdAt: pc.createdAt,
      };
    }

    // Partner presence (gated server-side by the partner's "Share activity" pref)
    let isPartnerOnline = false;
    if (partnerStatusResult.status === 'fulfilled' && partnerStatusResult.value) {
      isPartnerOnline = partnerStatusResult.value.isOnline;
    }

    // Active self-regulation window — so BOTH people see the same countdown.
    // Prefer the user's OWN active window (the person who started the space);
    // otherwise fall back to the partner's. Only show windows that haven't
    // already elapsed.
    const now = Date.now();
    const isFuture = (iso: string | null | undefined): iso is string =>
      Boolean(iso) && Date.parse(iso as string) > now;

    let spaceWindow: DashboardSpaceWindow | null = null;
    const myEndsAt =
      myWindowResult.status === 'fulfilled' ? myWindowResult.value?.spaceEndsAt : null;
    const partnerEndsAt =
      partnerWindowResult.status === 'fulfilled'
        ? partnerWindowResult.value?.spaceEndsAt
        : null;

    if (isFuture(myEndsAt)) {
      spaceWindow = { owner: 'self', spaceEndsAt: myEndsAt };
    } else if (isFuture(partnerEndsAt)) {
      spaceWindow = { owner: 'partner', spaceEndsAt: partnerEndsAt };
    }

    const anyFailed =
      meResult.status === 'rejected' && relResult.status === 'rejected';

    setData({
      userName,
      partnerName,
      isPartnerOnline,
      relationshipDays,
      rhythmItems: [],
      hasMoodToday,
      currentMood,
      partnerMood,
      spaceWindow,
      loading: false,
      error: anyFailed ? 'Some dashboard data could not be loaded.' : null,
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  return { ...data, refresh: load };
}
