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
import type {
  AuthResponse,
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
    const result = await api.post<AuthResponse>('/api/auth/login', request);
    tokenStore.setTokens(result.accessToken, result.refreshToken);
    return result;
  },

  /**
   * Register a new account. Stores the returned access + refresh tokens
   * so subsequent requests are authenticated and the session can be renewed.
   */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    const result = await api.post<AuthResponse>('/api/auth/register', request);
    tokenStore.setTokens(result.accessToken, result.refreshToken);
    return result;
  },

  /**
   * Fetch the currently authenticated user. Requires a valid token.
   */
  getMe(): Promise<UserResponse> {
    return api.get<UserResponse>('/api/users/me');
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
