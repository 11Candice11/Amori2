/**
 * moodService — wraps the Amori mood check-in API.
 *
 * Endpoints used:
 *   POST   /api/moods/check-ins   → create a new check-in
 *   GET    /api/moods/check-ins   → every check-in, newest first
 *   GET    /api/moods/current     → most recent check-in
 *
 * Backend enum values (integers, not strings):
 *   CheckInType: Morning=1, Midday=2, Evening=3, AdHoc=4
 *   MoodType:    Happy=1, Calm=2, Anxious=3, Sad=4, Angry=5, Overwhelmed=6, Numb=7, Other=8
 */
import { api } from '../../../services/api/client';
import type { CheckInResponse } from '../../../services/api/types';
import { BackendCheckIn, BackendMood, type BackendMoodType } from '../types/mood.types';

export interface CreateCheckInPayload {
  checkInType: number;
  mood: number;
  intensity: number;
  isSharedWithPartner: boolean;
  whatHappened?: string | null;
  feelings?: string | null;
  perceivedCause?: string | null;
  whatINeed?: string | null;
}

export const moodService = {
  async createCheckIn(
    mood: BackendMoodType,
    moodLabel: string,
    isSharedWithPartner = true,
  ): Promise<CheckInResponse> {
    const payload: CreateCheckInPayload = {
      checkInType: BackendCheckIn.AdHoc, // 4
      mood,                               // numeric enum value
      intensity: 5,
      isSharedWithPartner,
      feelings: moodLabel,               // human-readable label e.g. "Anxious"
    };
    return api.post<CheckInResponse>('/api/moods/check-ins', payload);
  },

  async createIDontKnow(): Promise<CheckInResponse> {
    const payload: CreateCheckInPayload = {
      checkInType: BackendCheckIn.AdHoc,
      mood: BackendMood.Other, // 8
      intensity: 5,
      isSharedWithPartner: false,
      // Send a human-readable label rather than null. Every other check-in
      // sends a non-null `feelings`, and the backend rejects an "Other" mood
      // with no accompanying text — which made the "I don't know" option fail
      // silently. This keeps the payload shape consistent.
      feelings: "I don't know",
    };
    return api.post<CheckInResponse>('/api/moods/check-ins', payload);
  },

  /**
   * Every check-in the user has logged, newest first.
   *
   * Used by features that need mood *history* rather than the latest mood
   * (e.g. the Weekly Reflection's day-by-day strip). Deliberately unfiltered
   * by date so callers can page back through past weeks without refetching —
   * the same "fetch once, slice locally" shape as memories/timeline/hugs.
   */
  async getCheckIns(): Promise<CheckInResponse[]> {
    return api.get<CheckInResponse[]>('/api/moods/check-ins');
  },

  async getCurrent(): Promise<CheckInResponse | null> {
    try {
      return await api.get<CheckInResponse>('/api/moods/current');
    } catch {
      return null;
    }
  },

  async getPartnerCurrent(): Promise<CheckInResponse | null> {
    try {
      return await api.get<CheckInResponse>('/api/moods/partner-current');
    } catch {
      return null;
    }
  },
};
