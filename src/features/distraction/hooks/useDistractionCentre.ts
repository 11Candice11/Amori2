/**
 * useDistractionCentre — loads the data the Distraction hub needs, gracefully
 * degrading per-call (mirrors the useDashboard pattern; no React Query).
 */
import { useCallback, useEffect, useState } from 'react';

import { distractionService } from '../services/distractionService';
import type {
  GameResponse,
  GameSessionResponse,
  HiddenObjectPuzzleResponse,
  QuizQuestionResponse,
  WouldYouRatherQuestionResponse,
} from '../../../services/api/types';

export interface DistractionData {
  games: GameResponse[];
  quizQuestions: QuizQuestionResponse[];
  wouldYouRather: WouldYouRatherQuestionResponse[];
  hiddenPuzzles: HiddenObjectPuzzleResponse[];
  history: GameSessionResponse[];
  /** Best recorded 2048 score for the couple, if any. */
  best2048: number | null;
  loading: boolean;
  error: string | null;
}

const INITIAL: DistractionData = {
  games: [],
  quizQuestions: [],
  wouldYouRather: [],
  hiddenPuzzles: [],
  history: [],
  best2048: null,
  loading: true,
  error: null,
};

export function useDistractionCentre(): DistractionData & { refresh: () => void } {
  const [data, setData] = useState<DistractionData>(INITIAL);

  const load = useCallback(async () => {
    setData(d => ({ ...d, loading: true, error: null }));

    const [gamesR, quizR, wyrR, puzzlesR, historyR] = await Promise.allSettled([
      distractionService.getGames(),
      distractionService.getQuizQuestions(),
      distractionService.getWouldYouRather(),
      distractionService.getHiddenObjectPuzzles(),
      distractionService.getHistory(),
    ]);

    const games = gamesR.status === 'fulfilled' ? gamesR.value : [];
    const quizQuestions = quizR.status === 'fulfilled' ? quizR.value : [];
    const wouldYouRather = wyrR.status === 'fulfilled' ? wyrR.value : [];
    const hiddenPuzzles = puzzlesR.status === 'fulfilled' ? puzzlesR.value : [];
    const history = historyR.status === 'fulfilled' ? historyR.value : [];

    // Highest score across completed 2048 sessions (title match, since the
    // seeded games list may not include a 2048 entry yet).
    const best2048 =
      history
        .filter(
          s =>
            s.status === 'Completed' &&
            typeof s.score === 'number' &&
            /2048/i.test(s.gameTitle),
        )
        .reduce<number | null>(
          (max, s) => (s.score! > (max ?? -1) ? s.score! : max),
          null,
        );

    const allFailed =
      gamesR.status === 'rejected' &&
      quizR.status === 'rejected' &&
      wyrR.status === 'rejected';

    setData({
      games,
      quizQuestions,
      wouldYouRather,
      hiddenPuzzles,
      history,
      best2048,
      loading: false,
      error: allFailed ? 'Could not load the Distraction Centre.' : null,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, refresh: load };
}
