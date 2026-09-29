/**
 * widgetBridge — thin, safe wrapper around the native `AmoriWidgetBridge`
 * module (iOS only).
 *
 * Two surfaces are exposed:
 *   • Partner-mood home-screen widget — `setPartnerMood` writes a snapshot into
 *     the App Group container and refreshes the WidgetKit timeline.
 *   • Splitting self-regulation Live Activity — start / update / end the
 *     Lock Screen + Dynamic Island countdown.
 *
 * Every call is a no-op on platforms/OS versions without the native module
 * (Android, iOS < 16.1 for Live Activities), so callers never need to branch.
 */
import { NativeModules, Platform } from 'react-native';

interface AmoriWidgetBridgeModule {
  setPartnerMood(payload: {
    mood?: string | null;
    feelings?: string | null;
    partnerName?: string | null;
    updatedAt?: string | null;
  }): Promise<void>;
  areLiveActivitiesEnabled(): Promise<boolean>;
  startSplittingActivity(payload: {
    endsAt: number;
    startedAt?: number;
    owner: 'self' | 'partner';
    partnerName?: string | null;
  }): Promise<string>;
  updateSplittingActivity(payload: {
    endsAt: number;
    startedAt?: number;
    owner?: 'self' | 'partner';
    finished?: boolean;
  }): Promise<void>;
  endSplittingActivity(payload: { finished?: boolean }): Promise<void>;
}

const native: AmoriWidgetBridgeModule | undefined =
  Platform.OS === 'ios'
    ? (NativeModules.AmoriWidgetBridge as AmoriWidgetBridgeModule | undefined)
    : undefined;

/** Whether the native widget/Live Activity bridge is available on this build. */
export const isWidgetBridgeAvailable = (): boolean => native != null;

export interface PartnerMoodWidgetData {
  /** Backend MoodType label, e.g. "Calm". */
  mood: string;
  /** Human-readable feeling label the partner chose, if any. */
  feelings?: string | null;
  /** Partner's display name for the widget caption. */
  partnerName?: string | null;
  /** ISO-8601 timestamp of the partner's check-in. */
  updatedAt?: string | null;
}

export interface SplittingActivityData {
  /** Epoch ms when the self-regulation window ends. */
  endsAt: number;
  /** Epoch ms when the window started (defaults to now on the native side). */
  startedAt?: number;
  /** Whose window this is — controls the caption wording. */
  owner: 'self' | 'partner';
  /** Partner's display name, for the "giving <name> space" caption. */
  partnerName?: string | null;
}

/** Swallow native errors: widget/Live Activity failures must never crash a flow. */
async function safe<T>(op: () => Promise<T>): Promise<T | undefined> {
  try {
    return await op();
  } catch (err) {
    if (__DEV__) console.warn('[widgetBridge]', err);
    return undefined;
  }
}

export const widgetBridge = {
  isAvailable: isWidgetBridgeAvailable,

  // ── Partner-mood widget ────────────────────────────────────────────────────

  /** Push the partner's latest shared mood to the home-screen widget. */
  async setPartnerMood(data: PartnerMoodWidgetData): Promise<void> {
    if (!native) return;
    await safe(() =>
      native.setPartnerMood({
        mood: data.mood,
        feelings: data.feelings ?? null,
        partnerName: data.partnerName ?? null,
        updatedAt: data.updatedAt ?? null,
      }),
    );
  },

  /** Clear the widget (no partner mood to show). */
  async clearPartnerMood(): Promise<void> {
    if (!native) return;
    await safe(() => native.setPartnerMood({ mood: null }));
  },

  // ── Splitting-countdown Live Activity ───────────────────────────────────────

  /** Whether the user has Live Activities enabled for Amori. */
  async liveActivitiesEnabled(): Promise<boolean> {
    if (!native) return false;
    return (await safe(() => native.areLiveActivitiesEnabled())) ?? false;
  },

  /**
   * Start the splitting-countdown Live Activity. Resolves to the activity id,
   * or undefined if it couldn't start (unsupported OS, disabled, or no bridge).
   * Open-ended windows (no fixed end) are skipped — a Live Activity needs a
   * concrete end time to count down to.
   */
  async startSplittingActivity(data: SplittingActivityData): Promise<string | undefined> {
    if (!native || !Number.isFinite(data.endsAt)) return undefined;
    return safe(() =>
      native.startSplittingActivity({
        endsAt: data.endsAt,
        startedAt: data.startedAt,
        owner: data.owner,
        partnerName: data.partnerName ?? null,
      }),
    );
  },

  /** Update the running countdown (e.g. after extending the space window). */
  async updateSplittingActivity(payload: {
    endsAt: number;
    startedAt?: number;
    owner?: 'self' | 'partner';
    finished?: boolean;
  }): Promise<void> {
    if (!native || !Number.isFinite(payload.endsAt)) return;
    await safe(() => native.updateSplittingActivity(payload));
  },

  /** End the running countdown. `finished` marks it complete vs cancelled. */
  async endSplittingActivity(finished = true): Promise<void> {
    if (!native) return;
    await safe(() => native.endSplittingActivity({ finished }));
  },
};
