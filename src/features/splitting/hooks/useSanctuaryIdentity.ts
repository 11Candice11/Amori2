/**
 * useSanctuaryIdentity — resolves the real display names for the splitting
 * flow's partner-facing screens.
 *
 * The "Partner Sanctuary Dispatch" screen is written from the partner's point
 * of view: it needs the current user's name ("<you> is taking care of
 * themselves") and the partner's name (who the dispatch is guiding). Both come
 * from the backend rather than hardcoded placeholders. Degrades gracefully to
 * gentle fallbacks if a call fails so the flow never breaks mid-grounding.
 */
import { useEffect, useState } from 'react';
import { api } from '../../../services/api/client';
import { authService } from '../../../services/auth/authService';
import type { RelationshipResponse } from '../../../services/api/types';

export interface SanctuaryIdentity {
  /** The current (grounding) user's display name. */
  userName: string;
  /** The partner's display name (the person receiving the dispatch). */
  partnerName: string;
  loading: boolean;
}

export function useSanctuaryIdentity(): SanctuaryIdentity {
  const [identity, setIdentity] = useState<SanctuaryIdentity>({
    userName: '',
    partnerName: '',
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [meResult, relResult] = await Promise.allSettled([
        authService.getMe(),
        api.get<RelationshipResponse>('/api/relationships/me'),
      ]);

      const userName =
        meResult.status === 'fulfilled' ? meResult.value.name ?? '' : '';

      let partnerName = '';
      if (relResult.status === 'fulfilled' && relResult.value) {
        const myId = meResult.status === 'fulfilled' ? meResult.value.id : null;
        const partner =
          relResult.value.members?.find(m => m.id !== myId) ??
          relResult.value.members?.[0];
        partnerName = partner?.name ?? '';
      }

      if (!cancelled) {
        setIdentity({ userName, partnerName, loading: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return identity;
}
