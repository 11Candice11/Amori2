import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MoodStackParamList } from './MoodStackParamList';
import type { HugStackParamList } from './HugStackParamList';
import type { SplittingStackParamList } from './SplittingStackParamList';
import type { IncidentStackParamList } from './IncidentStackParamList';
import type { TogetherStackParamList } from './TogetherStackParamList';
import type { DistractionStackParamList } from './DistractionStackParamList';
import type { TimelineStackParamList } from './TimelineStackParamList';

export type MainTabParamList = {
  Home: undefined;
  CheckIn: NavigatorScreenParams<MoodStackParamList> | undefined;
  Together: NavigatorScreenParams<TogetherStackParamList> | undefined;
  Desk: NavigatorScreenParams<IncidentStackParamList> | undefined;
  /**
   * The settings tab. `openLink` carries a nonce (e.g. Date.now()) that, when
   * it changes, tells ProfileScreen to open the Link Partner modal — used when
   * a partner link-request notification is tapped.
   */
  Profile: { openLink?: number } | undefined;
  /**
   * The Hug flow (nested stack). Deliberately absent from TAB_CONFIG so it
   * has no bottom-bar button — it's reached from the dashboard "Send a hug"
   * action and from hug push notifications.
   */
  Hugs: NavigatorScreenParams<HugStackParamList> | undefined;
  /**
   * The "I'm Splitting" grounding flow (nested stack). Hidden from the bottom
   * bar — reached from the dashboard "I'm splitting" grounding action.
   */
  Splitting: NavigatorScreenParams<SplittingStackParamList> | undefined;
  /**
   * Distraction hub. Hidden from the bottom bar — reached from the dashboard
   * "Distraction" quick-action.
   */
  Distraction: NavigatorScreenParams<DistractionStackParamList> | undefined;
  /**
   * Hearth Vault of saved surprises. Hidden from the bottom bar — reached from
   * the dashboard "View vault" action after the Daily Artifact is opened.
   */
  Vault: undefined;
  /**
   * The relationship milestone timeline (nested stack). Hidden from the bottom
   * bar — reached from the Together dashboard.
   */
  Timeline: NavigatorScreenParams<TimelineStackParamList> | undefined;
  /**
   * The notifications inbox (hugs, reminders, partner-link requests, etc.).
   * Hidden from the bottom bar — reached from the header bell on the tab roots.
   */
  Notifications: undefined;
};

/**
 * Tabs shown in the bottom nav bar. Any Tab.Screen not listed here (e.g. the
 * hidden "Hugs" flow) is navigable but renders no bottom-bar button.
 */
export const TAB_CONFIG = [
  { name: 'Home' as const,     label: 'Sanctuary' },
  { name: 'CheckIn' as const,  label: 'Check-in' },
  { name: 'Together' as const, label: 'Together' },
  { name: 'Desk' as const,     label: 'Desk' },
  { name: 'Profile' as const,  label: 'Settings' },
];

/** Route names that appear in the bottom nav bar. */
export const TAB_BAR_ROUTES = TAB_CONFIG.map((t) => t.name) as string[];
