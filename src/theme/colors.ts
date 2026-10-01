/**
 * Theme colors.
 *
 * The palette is selected along TWO axes:
 *   - mode:    'light' | 'dark'
 *   - variant: 'botanical' (the original green theme) | 'gold' (the warm-gold
 *              scheme applied when a user checks in "high energy pleasant")
 *
 * All palettes share the exact same token keys. The exported `colors` object
 * is a *live* object: `applyTheme(mode, variant)` overwrites its properties in
 * place with the chosen palette.
 *
 * Most styles are created via module-level `StyleSheet.create({...})`, which
 * captures color values at import time. So switching palettes requires the
 * React tree to remount (see ThemeProvider's remount key) for the new values
 * to take effect. `applyTheme` is always called *before* that remount so
 * freshly evaluated StyleSheets read the active palette.
 */

export type ThemeMode = 'light' | 'dark';

/** Which color family is active. Set to 'gold' by a high-energy-pleasant check-in. */
export type ThemeVariant = 'botanical' | 'gold';

export type Palette = {
  primary: string;
  primaryLight: string;
  secondary: string;
  tertiary: string;

  // Accent
  gold: string;

  // Text / neutrals
  neutral: string;
  neutralMuted: string;
  neutralSubtle: string;

  // Backgrounds & surfaces
  background: string;
  surface: string;
  surfaceCard: string;

  // Call-to-action
  ctaBackground: string;
  ctaText: string;

  // Status / feedback
  emergency: string;
  emergencyBg: string;
  statusDot: string;
  rhythmComplete: string;

  // Tabs
  tabActive: string;
  tabInactive: string;

  border: string;

  // Gold tint overlays — use these instead of hardcoding rgba(197,163,101,0.XX)
  // or rgba(223,186,115,0.XX) throughout the codebase. Each name encodes the
  // alpha as a two-digit percentage (e.g. goldTint08 = 8% opacity gold).
  goldTint08: string;
  goldTint12: string;
  goldTint15: string;
  goldTint25: string;
  goldTint35: string;
};

// ─── Botanical dark palette (original / default theme) ──────────────────────────
export const darkPalette: Palette = {
  primary: '#064E3B',
  primaryLight: '#A7D2B6',
  secondary: '#022C22',
  tertiary: '#D4AF37',

  // Accent
  gold: '#C5A365',

  // Text / neutrals
  neutral: '#FDFCF0',
  neutralMuted: 'rgba(253, 252, 240, 0.64)',
  neutralSubtle: 'rgba(253, 252, 240, 0.38)',

  // Backgrounds & surfaces
  background: '#0A140F',
  surface: '#0A140F',
  surfaceCard: '#111D16',

  // Call-to-action
  ctaBackground: '#C5A365',
  ctaText: '#0A140F',

  // Status / feedback
  emergency: '#E07A5F',
  emergencyBg: 'rgba(224, 122, 95, 0.14)',
  statusDot: '#A7D2B6',
  rhythmComplete: '#A7D2B6',

  // Tabs
  tabActive: '#C5A365',
  tabInactive: '#E0E0E0',

  border: 'rgba(253, 252, 240, 0.08)',

  // Gold tint overlays
  goldTint08: 'rgba(197,163,101,0.08)',
  goldTint12: 'rgba(197,163,101,0.12)',
  goldTint15: 'rgba(197,163,101,0.15)',
  goldTint25: 'rgba(197,163,101,0.25)',
  goldTint35: 'rgba(197,163,101,0.35)',
};

// ─── Botanical light palette ────────────────────────────────────────────────────
// Brand green (Primary #064E3B) on a warm off-white surface (#FAF8F5). The gold
// accents use the tertiary/secondary golds from the gold palette board
// (Tertiary #A48344, Secondary #C5A059) per product direction.
export const lightPalette: Palette = {
  primary: '#064E3B',
  primaryLight: '#A7D2B6',
  secondary: '#C5A059',
  tertiary: '#A48344',

  // Accent — the tertiary gold (#A48344) reads with strong contrast on light surfaces.
  gold: '#A48344',

  // Text / neutrals — dark botanical green on light surfaces.
  neutral: '#0A140F',
  neutralMuted: 'rgba(10, 20, 15, 0.64)',
  neutralSubtle: 'rgba(10, 20, 15, 0.42)',

  // Backgrounds & surfaces
  background: '#FAF8F5',
  surface: '#FAF8F5',
  surfaceCard: '#FFFFFF',

  // Call-to-action — dark green button with light text.
  ctaBackground: '#064E3B',
  ctaText: '#FAF8F5',

  // Status / feedback
  emergency: '#B34040',
  emergencyBg: 'rgba(179, 64, 64, 0.10)',
  statusDot: '#A48344',
  rhythmComplete: '#A48344',

  // Tabs
  tabActive: '#A48344',
  tabInactive: 'rgba(10, 20, 15, 0.38)',

  border: 'rgba(10, 20, 15, 0.10)',

  // Gold tint overlays
  goldTint08: 'rgba(164,131,68,0.08)',
  goldTint12: 'rgba(164,131,68,0.12)',
  goldTint15: 'rgba(164,131,68,0.15)',
  goldTint25: 'rgba(164,131,68,0.25)',
  goldTint35: 'rgba(164,131,68,0.35)',
};

// ─── Gold dark palette ("high energy pleasant") ─────────────────────────────────
// Warm gold on near-black, from the gold palette board:
// Primary #DFBA73, Secondary #C5A059, Tertiary #A48344, Neutral #0D120E.
export const goldDarkPalette: Palette = {
  primary: '#DFBA73',
  primaryLight: '#EBD3A3',
  secondary: '#C5A059',
  tertiary: '#A48344',

  // Accent — the brightest gold leads.
  gold: '#DFBA73',

  // Text / neutrals — warm off-white on the near-black neutral.
  neutral: '#FBF3E4',
  neutralMuted: 'rgba(251, 243, 228, 0.64)',
  neutralSubtle: 'rgba(251, 243, 228, 0.38)',

  // Backgrounds & surfaces — Neutral #0D120E is the base; cards lift slightly.
  background: '#0D120E',
  surface: '#0D120E',
  surfaceCard: '#171C15',

  // Call-to-action — gold button with near-black text.
  ctaBackground: '#DFBA73',
  ctaText: '#0D120E',

  // Status / feedback
  emergency: '#E07A5F',
  emergencyBg: 'rgba(224, 122, 95, 0.14)',
  statusDot: '#DFBA73',
  rhythmComplete: '#DFBA73',

  // Tabs
  tabActive: '#DFBA73',
  tabInactive: 'rgba(251, 243, 228, 0.42)',

  border: 'rgba(251, 243, 228, 0.08)',

  // Gold tint overlays
  goldTint08: 'rgba(223,186,115,0.08)',
  goldTint12: 'rgba(223,186,115,0.12)',
  goldTint15: 'rgba(223,186,115,0.15)',
  goldTint25: 'rgba(223,186,115,0.25)',
  goldTint35: 'rgba(223,186,115,0.35)',
};

// ─── Gold light palette ─────────────────────────────────────────────────────────
// Light counterpart of the gold scheme, so toggling light mode while the gold
// variant is active stays coherent.
export const goldLightPalette: Palette = {
  primary: '#A48344',
  primaryLight: '#DFBA73',
  secondary: '#C5A059',
  tertiary: '#A48344',

  gold: '#A48344',

  neutral: '#0D120E',
  neutralMuted: 'rgba(13, 18, 14, 0.64)',
  neutralSubtle: 'rgba(13, 18, 14, 0.42)',

  background: '#FBF6EC',
  surface: '#FBF6EC',
  surfaceCard: '#FFFFFF',

  ctaBackground: '#A48344',
  ctaText: '#FBF6EC',

  emergency: '#B34040',
  emergencyBg: 'rgba(179, 64, 64, 0.10)',
  statusDot: '#A48344',
  rhythmComplete: '#A48344',

  tabActive: '#A48344',
  tabInactive: 'rgba(13, 18, 14, 0.38)',

  border: 'rgba(13, 18, 14, 0.10)',

  // Gold tint overlays
  goldTint08: 'rgba(164,131,68,0.08)',
  goldTint12: 'rgba(164,131,68,0.12)',
  goldTint15: 'rgba(164,131,68,0.15)',
  goldTint25: 'rgba(164,131,68,0.25)',
  goldTint35: 'rgba(164,131,68,0.35)',
};

const palettes: Record<ThemeVariant, Record<ThemeMode, Palette>> = {
  botanical: { dark: darkPalette, light: lightPalette },
  gold: { dark: goldDarkPalette, light: goldLightPalette },
};

/**
 * The live color object consumed across the app (`import { colors } ...`).
 * Initialized to the botanical dark palette; `applyTheme` mutates it in place.
 */
export const colors: Palette = { ...darkPalette };

/**
 * Overwrite the live `colors` object with the palette for `mode` + `variant`.
 * Call this *before* remounting the React tree so newly created StyleSheets
 * pick up the active palette.
 */
export function applyTheme(mode: ThemeMode, variant: ThemeVariant = 'botanical'): void {
  Object.assign(colors, palettes[variant][mode]);
}

export type ColorToken = keyof Palette;
