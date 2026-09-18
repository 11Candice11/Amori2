export const fontFamilies = {
  headline: 'EBGaramond-Regular',
  headlineMedium: 'EBGaramond-Medium',
  body: 'Manrope-Regular',
  bodyMedium: 'Manrope-Medium',
  bodySemiBold: 'Manrope-SemiBold',
} as const;

export const typography = {
  // ─── Display / headlines ──────────────────────────────────────────────────
  headlineLg: {
    fontFamily: fontFamilies.headline,
    fontSize: 34,
    lineHeight: 40,
  },
  headline: {
    fontFamily: fontFamilies.headline,
    fontSize: 28,
    lineHeight: 34,
  },
  headlineSm: {
    fontFamily: fontFamilies.headline,
    fontSize: 22,
    lineHeight: 28,
  },

  // ─── Body ───────────────────────────────────────────────────────────────────
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySemiBold: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
  },

  // ─── Labels ───────────────────────────────────────────────────────────────
  label: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  tabLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
} as const;
