/**
 * distractionService — wraps the Distraction Centre APIs.
 *
 * Endpoints:
 *   Games:
 *     GET  /api/games
 *     GET  /api/games/{gameId}
 *     POST /api/games/{gameId}/sessions            → start a session
 *     POST /api/games/sessions/{sessionId}/complete → record final score
 *     GET  /api/games/history
 *   Couple Quiz:
 *     GET  /api/quiz/questions
 *     POST /api/quiz/sessions                       → submit answers, get score
 *     GET  /api/quiz/history
 *   Would You Rather:
 *     GET  /api/would-you-rather/questions
 *     POST /api/would-you-rather/questions/{id}/answer
 */
import { api } from '../../../services/api/client';
import type {
  CreateHiddenObjectPuzzleRequest,
  CreateQuizQuestionRequest,
  CreateWouldYouRatherRequest,
  GameResponse,
  GameSessionResponse,
  HiddenObjectPuzzleResponse,
  QuizQuestionResponse,
  QuizSessionResponse,
  SubmitQuizRequest,
  WouldYouRatherQuestionResponse,
} from '../../../services/api/types';

export const distractionService = {
  // ── Games ────────────────────────────────────────────────────────────────
  async getGames(): Promise<GameResponse[]> {
    return api.get<GameResponse[]>('/api/games');
  },

  async startSession(gameId: string): Promise<GameSessionResponse> {
    return api.post<GameSessionResponse>(`/api/games/${gameId}/sessions`);
  },

  async completeSession(
    sessionId: string,
    score: number,
  ): Promise<GameSessionResponse> {
    return api.post<GameSessionResponse>(
      `/api/games/sessions/${sessionId}/complete`,
      { score },
    );
  },

  async getHistory(): Promise<GameSessionResponse[]> {
    return api.get<GameSessionResponse[]>('/api/games/history');
  },

  /**
   * Convenience: start a session, then immediately complete it with a score.
   * Client-side games (2048, Hidden Number) manage their own state; we only
   * persist the outcome. Returns null if either call fails (non-blocking).
   */
  async recordPlay(gameId: string, score: number): Promise<GameSessionResponse | null> {
    try {
      const session = await distractionService.startSession(gameId);
      return await distractionService.completeSession(session.id, score);
    } catch {
      return null;
    }
  },

  // ── Couple Quiz ────────────────────────────────────────────────────────────
  async getQuizQuestions(): Promise<QuizQuestionResponse[]> {
    return api.get<QuizQuestionResponse[]>('/api/quiz/questions');
  },

  async submitQuiz(request: SubmitQuizRequest): Promise<QuizSessionResponse> {
    return api.post<QuizSessionResponse>('/api/quiz/sessions', request);
  },

  async getQuizHistory(): Promise<QuizSessionResponse[]> {
    return api.get<QuizSessionResponse[]>('/api/quiz/history');
  },

  /** Author a new "about us" question for the couple. */
  async createQuizQuestion(
    request: CreateQuizQuestionRequest,
  ): Promise<QuizQuestionResponse> {
    return api.post<QuizQuestionResponse>('/api/quiz/questions', request);
  },

  // ── Would You Rather ─────────────────────────────────────────────────────
  async getWouldYouRather(): Promise<WouldYouRatherQuestionResponse[]> {
    return api.get<WouldYouRatherQuestionResponse[]>(
      '/api/would-you-rather/questions',
    );
  },

  async answerWouldYouRather(
    questionId: string,
    choseOptionA: boolean,
  ): Promise<WouldYouRatherQuestionResponse> {
    return api.post<WouldYouRatherQuestionResponse>(
      `/api/would-you-rather/questions/${questionId}/answer`,
      { choseOptionA },
    );
  },

  /** Author a new either/or prompt for the couple. */
  async createWouldYouRather(
    request: CreateWouldYouRatherRequest,
  ): Promise<WouldYouRatherQuestionResponse> {
    return api.post<WouldYouRatherQuestionResponse>(
      '/api/would-you-rather/questions',
      request,
    );
  },

  // ── Hidden Object Puzzles ────────────────────────────────────────────────
  async getHiddenObjectPuzzles(): Promise<HiddenObjectPuzzleResponse[]> {
    return api.get<HiddenObjectPuzzleResponse[]>('/api/hidden-object-puzzles');
  },

  /** Create a hidden-object puzzle for your partner (image uploaded first). */
  async createHiddenObjectPuzzle(
    request: CreateHiddenObjectPuzzleRequest,
  ): Promise<HiddenObjectPuzzleResponse> {
    return api.post<HiddenObjectPuzzleResponse>(
      '/api/hidden-object-puzzles',
      request,
    );
  },

  async deleteHiddenObjectPuzzle(puzzleId: string): Promise<void> {
    return api.delete<void>(`/api/hidden-object-puzzles/${puzzleId}`);
  },
};
