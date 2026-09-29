/**
 * Display metadata for mood quadrants on the Weekly Reflection.
 *
 * The check-in feature uses the Mood Meter valence×arousal colours (red /
 * yellow / green / blue). Here we keep the same family but lean warm and muted
 * to sit inside the Sanctuary card set — the gold accent stays reserved for
 * "positive" (pleasant) states, matching the dashboard's use of gold.
 */
import type { MoodQuadrant } from '../../mood/types/mood.types';

export interface QuadrantDisplay {
  /** Dot colour on the MON…SUN strip. */
  dotColor: string;
  /** Short, gentle title used on the dominant-mood card. */
  title: string;
  /** One-line, warm descriptor. */
  tagline: string;
}

export const QUADRANT_DISPLAY: Record<MoodQuadrant, QuadrantDisplay> = {
  HIGH_PLEASANT: {
    // Warm gold — bright, energised, pleasant.
    dotColor: '#DFBA73',
    title: 'Bright & Energised',
    tagline: 'A lively, upbeat current ran through the week.',
  },
  LOW_PLEASANT: {
    // Soft sage — calm, settled, pleasant. The "grounded" state.
    dotColor: '#A7D2B6',
    title: 'Deeply Grounded',
    tagline: 'A calm, unhurried space between the noise.',
  },
  HIGH_UNPLEASANT: {
    // Muted terracotta — stirred up, on edge.
    dotColor: '#E07A5F',
    title: 'Stirred & Restless',
    tagline: 'A lot of energy with nowhere settled to put it.',
  },
  LOW_UNPLEASANT: {
    // Dusty blue — heavy, drained, tender.
    dotColor: '#7C93B3',
    title: 'Tender & Heavy',
    tagline: 'A quieter, heavier week that asked for gentleness.',
  },
};

/** Whether a quadrant is a "pleasant" (positive) state — earns the gold accent. */
export function isPleasant(quadrant: MoodQuadrant): boolean {
  return quadrant === 'HIGH_PLEASANT' || quadrant === 'LOW_PLEASANT';
}
