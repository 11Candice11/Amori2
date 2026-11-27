/**
 * Auth service.
 *
 * Wraps the backend auth endpoints and manages the persisted tokens.
 *
 * Backend routes (see Amori.Api/Features/Auth + Users):
 *   POST /api/auth/register  -> AuthResponse { accessToken, refreshToken, accessTokenExpiresAt, user }
 *   POST /api/auth/login     -> AuthResponse { accessToken, refreshToken, accessTokenExpiresAt, user }
 *   POST /api/auth/refresh   -> AuthResponse (rotates the refresh token)
 *   POST /api/auth/logout    -> 204 (revokes the refresh token)
 *   GET  /api/users/me       -> UserResponse { id, name, email }   (requires Bearer token)
 */
import { api, tokenStore } from '../api/client';
import { logger } from '../../utils/logger';
import type {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from '../api/types';

export const authService = {
  /**
   * Log in with email + password. Stores the returned access + refresh tokens
   * so subsequent requests are authenticated and the session can be renewed.
   */
  async login(request: LoginRequest): Promise<AuthResponse> {
    logger.log('Auth', `Login attempt for ${request.email}`);
    try {
      const result = await api.post<AuthResponse>('/api/auth/login', request);
      tokenStore.setTokens(result.accessToken, result.refreshToken);
      logger.log('Auth', 'Login succeeded — tokens stored');
      return result;
    } catch (err) {
      logger.error('Auth', 'Login failed', err);
      throw err;
    }
  },

  /**
   * Register a new account. Stores the returned access + refresh tokens
   * so subsequent requests are authenticated and the session can be renewed.
   */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    logger.log('Auth', `Register attempt for ${request.email}`);
    try {
      const result = await api.post<AuthResponse>('/api/auth/register', request);
      tokenStore.setTokens(result.accessToken, result.refreshToken);
      logger.log('Auth', 'Register succeeded — tokens stored');
      return result;
    } catch (err) {
      logger.error('Auth', 'Register failed', err);
      throw err;
    }
  },

  /**
   * Fetch the currently authenticated user. Requires a valid token.
   */
  getMe(): Promise<UserResponse> {
    logger.log('Auth', 'Fetching /api/users/me');
    return api.get<UserResponse>('/api/users/me');
  },

  /**
   * Change the signed-in user's password. Requires the current password for
   * verification. Returns 204 on success; the backend rejects a wrong current
   * password with a 401 (surfaced as an ApiError).
   *
   * Backend route: PATCH /api/users/me/password (authenticated).
   */
  async changePassword(request: ChangePasswordRequest): Promise<void> {
    await api.patch('/api/users/me/password', request);
  },

  /**
   * End the session. Best-effort revokes the refresh token on the server so it
   * can't be used to renew the session, then clears both tokens from memory and
   * disk. The user will not be restored on the next app launch.
   */
  async logout(): Promise<void> {
    const refreshToken = tokenStore.getRefresh();
    if (refreshToken) {
      try {
        await api.post('/api/auth/logout', { refreshToken });
      } catch (err) {
        // Network failure shouldn't block sign-out — clear locally regardless.
        console.warn('Failed to revoke refresh token on logout:', err);
      }
    }
    tokenStore.clear();
  },
};
