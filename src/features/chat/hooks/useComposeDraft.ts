import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { chatService } from '../services/chatService';
import {
  chatDraftStore,
  newLocalDraftId,
  type LocalChatDraft,
} from '../services/chatDraftStore';
import type { ChatAnswers, ChatTemplateType } from '../types/chat.types';

interface Params {
  templateType: ChatTemplateType;
  localDraftId?: string;
  conversationId?: string;
}

/**
 * Owns the mutable draft state for the guided compose flow and its persistence.
 *
 * A draft must survive navigation away, app backgrounding, and a full restart,
 * so every change is written to the on-device chatDraftStore, and the flow can
 * be resumed from either a local draft id or an existing server conversation.
 * The server draft is created lazily (on first meaningful save) and patched
 * thereafter, mirroring the local mirror so nothing is lost offline.
 */
export function useComposeDraft({ templateType, localDraftId, conversationId }: Params) {
  const [ready, setReady] = useState(false);
  const [answers, setAnswers] = useState<ChatAnswers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const localIdRef = useRef<string>(localDraftId ?? newLocalDraftId());
  const serverIdRef = useRef<string | null>(conversationId ?? null);

  // ── Hydrate on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      // Prefer a local draft (freshest, offline-safe); fall back to the server
      // conversation when resuming one that has no local mirror.
      let loaded: LocalChatDraft | null = null;
      if (localDraftId) loaded = await chatDraftStore.get(localDraftId);

      if (!loaded && conversationId) {
        try {
          const remote = await chatService.getConversation(conversationId);
          loaded = {
            localId: localIdRef.current,
            serverId: remote.id,
            templateType: remote.templateType,
            answers: remote.answers,
            stepIndex: 0,
            updatedAt: remote.updatedAt ?? remote.createdAt,
          };
          serverIdRef.current = remote.id;
        } catch {
          // Fall through to an empty draft.
        }
      }

      if (!cancelled && loaded) {
        localIdRef.current = loaded.localId;
        serverIdRef.current = loaded.serverId;
        setAnswers(loaded.answers);
        setStepIndex(loaded.stepIndex);
      }
      if (!cancelled) setReady(true);
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [localDraftId, conversationId]);

  /** Persist the current answers/step to the on-device store. */
  const persistLocal = useCallback(
    async (nextAnswers: ChatAnswers, nextStep: number) => {
      await chatDraftStore.save({
        localId: localIdRef.current,
        serverId: serverIdRef.current,
        templateType,
        answers: nextAnswers,
        stepIndex: nextStep,
      });
    },
    [templateType],
  );

  // Persist on backgrounding too, in case the OS kills the app while suspended.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        void persistLocal(answers, stepIndex);
      }
    });
    return () => sub.remove();
  }, [answers, stepIndex, persistLocal]);

  const setAnswer = useCallback(
    (input: string, value: string) => {
      setAnswers((prev) => {
        const next = { ...prev, [input]: value };
        void persistLocal(next, stepIndex);
        return next;
      });
    },
    [persistLocal, stepIndex],
  );

  const goToStep = useCallback(
    (index: number) => {
      setStepIndex(index);
      void persistLocal(answers, index);
    },
    [answers, persistLocal],
  );

  /**
   * Sync the draft to the server (create-or-patch). Returns the server id, or
   * null if the network call failed — the local draft is already safe either
   * way, so the caller can decide whether to surface the error.
   */
  const syncToServer = useCallback(
    async (composedMessage: string): Promise<string | null> => {
      try {
        if (serverIdRef.current) {
          const updated = await chatService.update(serverIdRef.current, {
            answers,
            composedMessage,
          });
          return updated.id;
        }
        const created = await chatService.create({ templateType, answers, composedMessage });
        serverIdRef.current = created.id;
        await persistLocal(answers, stepIndex); // record the new serverId locally
        return created.id;
      } catch {
        return null;
      }
    },
    [answers, templateType, persistLocal, stepIndex],
  );

  /** Discard the draft everywhere (local + server, if it exists). */
  const discard = useCallback(async () => {
    await chatDraftStore.remove(localIdRef.current);
    if (serverIdRef.current) {
      try {
        await chatService.remove(serverIdRef.current);
      } catch {
        /* best-effort — the local mirror is already gone */
      }
    }
  }, []);

  return {
    ready,
    answers,
    stepIndex,
    localId: localIdRef.current,
    serverId: serverIdRef.current,
    setAnswer,
    goToStep,
    syncToServer,
    discard,
  };
}
