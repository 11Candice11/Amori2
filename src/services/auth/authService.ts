/**
 * Auth service.
 *
 * Wraps the backend auth endpoints and manages the in-memory access token.
 *
 * Backend routes (see Amori.Api/Features/Auth + Users):
 *   POST /api/auth/register  -> AuthResponse { accessToken, user }
 *   POST /api/auth/login     -> AuthResponse { accessToken, user }
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
   * Log in with email + password. Stores the returned access token
   * so subsequent requests are authenticated.
   */
  async login(request: LoginRequest): Promise<AuthResponse> {
    const result = await api.post<AuthResponse>('/api/auth/login', request);
    tokenStore.set(result.accessToken);
    return result;
  },

  /**
   * Register a new account. Stores the returned access token
   * so subsequent requests are authenticated.
   */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    const result = await api.post<AuthResponse>('/api/auth/register', request);
    tokenStore.set(result.accessToken);
    return result;
  },

  /**
   * Fetch the currently authenticated user. Requires a valid token.
   */
  getMe(): Promise<UserResponse> {
    return api.get<UserResponse>('/api/users/me');
  },

  /**
   * Clear the stored token from memory and disk. The session ends here — any
   * subsequent authenticated request will fail until the user logs in again,
   * and the user will not be restored on the next app launch.
   */
  logout(): void {
    tokenStore.clear();
  },
};
