/**
 * Manages a single "I'm Splitting" grounding session against the backend.
 *
 * The flow spans several screens, so this hook is intentionally lightweight:
 * callers own the sessionId (threaded through navigation params) and call
 * these async methods at the appropriate step. Each method returns the updated
 * session so the caller can carry the new id/state forward.
 */
import { useCallback, useState } from 'react';
import { splittingService } from '../services/splittingService';
import type {
  SplittingSession,
  CreateSplittingSessionPayload,
  UpdateSplittingSessionPayload,
  CompleteSplittingSessionPayload,
} from '../types/splitting.types';

export function useSplittingSession() {
  const [session, setSession] = useState<SplittingSession | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T>(op: () => Promise<T>): Promise<T | null> => {
    setPending(true);
    setError(null);
    try {
      return await op();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      return null;
    } finally {
      setPending(false);
    }
  }, []);

  const create = useCallback(
    (payload: CreateSplittingSessionPayload) =>
      run(async () => {
        const created = await splittingService.createSession(payload);
        setSession(created);
        return created;
      }),
    [run],
  );

  const update = useCallback(
    (sessionId: string, payload: UpdateSplittingSessionPayload) =>
      run(async () => {
        const updated = await splittingService.updateSession(sessionId, payload);
        setSession(updated);
        return updated;
      }),
    [run],
  );

  const complete = useCallback(
    (sessionId: string, payload: CompleteSplittingSessionPayload = {}) =>
      run(async () => {
        const completed = await splittingService.completeSession(sessionId, payload);
        setSession(completed);
        return completed;
      }),
    [run],
  );

  const cancel = useCallback(
    (sessionId: string) =>
      run(async () => {
        const cancelled = await splittingService.cancelSession(sessionId);
        setSession(cancelled);
        return cancelled;
      }),
    [run],
  );

  return { session, pending, error, create, update, complete, cancel };
}
