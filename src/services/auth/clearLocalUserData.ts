/**
 * clearLocalUserData — wipe everything this device remembers about the user
 * who is signing out, so the next person to sign in on it inherits nothing.
 *
 * Covers both in-memory caches and on-device (AsyncStorage) data. Several of
 * these stores hold private content: Let's Chat drafts contain unsent message
 * text, custom splitting triggers are personal, and the daily-gift pin points
 * at the previous couple's memories.
 *
 * Add any new per-user store here. Device preferences (theme) are deliberately
 * kept — they belong to the phone, not the account.
 *
 * Every step is best-effort and independent: one store failing to clear must
 * not stop the others, and must never block sign-out.
 */
import { userSettingsStore } from '../../shared/state/userSettingsStore';
import { notificationStore } from '../../shared/state/notificationStore';
import { userPointsStore } from '../../shared/state/userPointsStore';
import { supportProfileStore } from '../../features/supportProfile/services/supportProfileStore';
import { badgeService } from '../../features/profile/services/badgeService';
import { resetBadgeRewardBaseline } from '../../features/vault/hooks/useBadgeRewardListener';
import { chatDraftStore } from '../../features/chat/services/chatDraftStore';
import { customTriggerStore } from '../../features/splitting/services/customTriggerStore';
import { dailyGiftStore } from '../../features/home/services/dailyGiftStore';
import { artifactStore } from '../../features/home/services/artifactStore';

export async function clearLocalUserData(): Promise<void> {
  // In-memory caches: synchronous, cleared first so no screen can render the
  // previous user's data while the async clears below are still running.
  const syncResets: Array<() => void> = [
    () => userSettingsStore.reset(),
    () => notificationStore.reset(),
    // Own + partner Support Preferences — no partner data leaks across accounts.
    () => supportProfileStore.reset(),
    () => userPointsStore.reset(),
    () => badgeService.reset(),
    // So the next user's already-earned badges don't all pop as "new".
    () => resetBadgeRewardBaseline(),
  ];
  for (const reset of syncResets) {
    try {
      reset();
    } catch (err) {
      console.warn('Failed to reset an in-memory store on sign-out:', err);
    }
  }

  // On-device storage. Each store's reset() already swallows its own errors;
  // allSettled is a second guard so one rejection can't skip the rest.
  await Promise.allSettled([
    chatDraftStore.reset(),
    customTriggerStore.reset(),
    dailyGiftStore.reset(),
    artifactStore.reset(),
  ]);
}
