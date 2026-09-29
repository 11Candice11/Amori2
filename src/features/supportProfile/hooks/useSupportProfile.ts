/**
 * Hooks for the Support Preferences feature. They wrap supportProfileStore so
 * screens get {data, loading, error, refresh} and re-render on cache changes
 * (including reset() on logout). Modeled on the app's other feature hooks.
 */
import { useCallback, useEffect, useState } from 'react';

import { supportProfileStore } from '../services/supportProfileStore';
import type { SupportProfile, PartnerSupportProfile } from '../types/supportProfile.types';

interface OwnState {
  profile: SupportProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** The signed-in user's own, editable profile. */
export function useOwnSupportProfile(): OwnState {
  const [profile, setProfile] = useState<SupportProfile | null>(supportProfileStore.getOwn());
  const [loading, setLoading] = useState<boolean>(supportProfileStore.getOwn() === null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await supportProfileStore.loadOwn(true);
    } catch {
      setError('We couldn’t load your profile. Pull to try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = supportProfileStore.subscribe(() => {
      setProfile(supportProfileStore.getOwn());
    });
    void supportProfileStore.loadOwn().finally(() => setLoading(false));
    return unsubscribe;
  }, []);

  return { profile, loading, error, refresh };
}

interface PartnerState {
  profile: PartnerSupportProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** The linked partner's read-only, shared-only profile. */
export function usePartnerSupportProfile(): PartnerState {
  const [profile, setProfile] = useState<PartnerSupportProfile | null>(
    supportProfileStore.getPartner(),
  );
  const [loading, setLoading] = useState<boolean>(supportProfileStore.getPartner() === null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await supportProfileStore.loadPartner(true);
    } catch {
      setError('We couldn’t load their profile right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = supportProfileStore.subscribe(() => {
      setProfile(supportProfileStore.getPartner());
    });
    void supportProfileStore.loadPartner().finally(() => setLoading(false));
    return unsubscribe;
  }, []);

  return { profile, loading, error, refresh };
}
