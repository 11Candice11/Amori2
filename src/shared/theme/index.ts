/**
 * Re-export of the canonical theme (src/theme) so imports from
 * `shared/theme` resolve to a single source of truth.
 */
export {
  colors,
  applyTheme,
  darkPalette,
  lightPalette,
  goldDarkPalette,
  goldLightPalette,
} from '../../theme/colors';
export { ThemeProvider, useThemeMode } from '../../theme/ThemeProvider';
export {
  themeStore,
  DEFAULT_THEME_MODE,
  DEFAULT_THEME_VARIANT,
  DEFAULT_THEME_PREFERENCE,
} from '../../theme/themeStore';
export type { ThemePreference } from '../../theme/themeStore';
export { typography, fontFamilies } from '../../theme/typography';
export { spacing, layout } from '../../theme/spacing';
export type { ColorToken, ThemeMode, ThemeVariant, Palette } from '../../theme/colors';
