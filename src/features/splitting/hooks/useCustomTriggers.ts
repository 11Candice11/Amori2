/**
 * useCustomTriggers — loads the person's own saved trigger options and keeps
 * them in sync while they add or remove one on the grounding checkpoint.
 *
 * Writes go through customTriggerStore (AsyncStorage) and the local list is
 * updated optimistically so the new chip appears immediately.
 */
import { useCallback, useEffect, useState } from 'react';
import { customTriggerStore } from '../services/customTriggerStore';
import type { TriggerGroup, TriggerOption } from '../types/splitting.types';

export function useCustomTriggers() {
  const [customTriggers, setCustomTriggers] = useState<TriggerOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    customTriggerStore
      .getAll()
      .then(saved => {
        if (!cancelled) setCustomTriggers(saved);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Persist a new trigger and return it so the caller can select it. Resolves
   * to null for an empty label; returns the existing option when the label is
   * already known (built-in or previously saved).
   */
  const addTrigger = useCallback(
    async (label: string, group: TriggerGroup): Promise<TriggerOption | null> => {
      const saved = await customTriggerStore.add(label, group);
      if (!saved) return null;
      setCustomTriggers(prev =>
        prev.some(t => t.id === saved.id) ? prev : [...prev, saved],
      );
      return saved;
    },
    [],
  );

  const removeTrigger = useCallback(async (triggerId: string) => {
    setCustomTriggers(prev => prev.filter(t => t.id !== triggerId));
    await customTriggerStore.remove(triggerId);
  }, []);

  return { customTriggers, loading, addTrigger, removeTrigger };
}
