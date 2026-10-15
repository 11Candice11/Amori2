/**
 * Amori API client.
 *
 * Uses the native fetch API — no external HTTP library needed.
 * The access token is persisted to disk with AsyncStorage so the session
 * survives app restarts until the user signs out.
 *
 * Default origin (dev and production): https://amori.ycare.org
 * See DEV_TARGET below to point development builds at a local backend instead.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { rewardsEvents } from './rewards';

// ── API origin selection ──────────────────────────────────────────────────────
// The hosted backend is reachable over HTTPS on a real domain (nginx terminates
// TLS on the EC2 box and reverse-proxies to the api container on :5001), so the
// emulator and physical devices all use the same origin. Because it's HTTPS on
// port 443 it also works on networks that block non-standard ports, and needs no
// iOS ATS exception or Android cleartext permit.
//
// Switch DEV_TARGET to run against a local backend instead:
//   'ec2'      → hosted backend at HOSTED_ORIGIN (works anywhere)
//   'emulator' → local backend via the Android emulator alias 10.0.2.2
//   'lan'      → local backend via the Mac's LAN IP (physical device, same WiFi)
type DevTarget = 'ec2' | 'emulator' | 'lan';
const DEV_TARGET: DevTarget = 'ec2';

const HOSTED_ORIGIN = 'https://amori.ycare.org'; // EC2 (eu-north-1) behind nginx/TLS
const LAN_ORIGIN = 'http://172.20.3.74:5001';    // Mac's LAN IP (update per network)
const EMULATOR_ORIGIN = 'http://10.0.2.2:5001';

const DEV_ORIGIN =
  DEV_TARGET === 'ec2' ? HOSTED_ORIGIN : DEV_TARGET === 'lan' ? LAN_ORIGIN : EMULATOR_ORIGIN;

const BASE_URL = __DEV__ ? DEV_ORIGIN : HOSTED_ORIGIN;

// ─── Persistent token store ─────────────────────────────────────────────────
// The token is cached in memory for synchronous access (request headers) and
// persisted to disk with AsyncStorage so the session survives app restarts.

const TOKEN_STORAGE_KEY = '@amori/auth-token';
const REFRESH_TOKEN_STORAGE_KEY = '@amori/refresh-token';
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

async function persistValue(key: string, value: string | null): Promise<void> {
  try {
    if (value === null) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (err) {
    console.error(`Failed to persist ${key}:`, err);
  }
}

async function loadValue(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (err) {
    console.error(`Failed to load ${key}:`, err);
    return null;
  }
}

export const tokenStore = {
  /** Synchronous read of the in-memory access token (used for request headers). */
  get: () => _accessToken,

  /** Synchronous read of the in-memory refresh token. */
  getRefresh: () => _refreshToken,

  /** Set the access token in memory and persist to disk. */
  set: (token: string | null) => {
    _accessToken = token;
    void persistValue(TOKEN_STORAGE_KEY, token);
  },

  /** Set the refresh token in memory and persist to disk. */
  setRefresh: (token: string | null) => {
    _refreshToken = token;
    void persistValue(REFRESH_TOKEN_STORAGE_KEY, token);
  },

  /**
   * Persist both tokens together after a login / register / refresh. Keeps the
   * access and refresh tokens in step so a half-written session can't occur.
   */
  setTokens: (accessToken: string, refreshToken: string) => {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    void persistValue(TOKEN_STORAGE_KEY, accessToken);
    void persistValue(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  },

  /** Clear both tokens from memory and disk. */
  clear: () => {
    _accessToken = null;
    _refreshToken = null;
    void persistValue(TOKEN_STORAGE_KEY, null);
    void persistValue(REFRESH_TOKEN_STORAGE_KEY, null);
  },

  /**
   * Hydrate both tokens from AsyncStorage on app startup. Returns the access
   * token for the bootstrap auth check. Call this once during bootstrap before
   * checking authentication state.
   */
  async hydrate(): Promise<string | null> {
    const [accessToken, refreshToken] = await Promise.all([
      loadValue(TOKEN_STORAGE_KEY),
      loadValue(REFRESH_TOKEN_STORAGE_KEY),
    ]);
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    return accessToken;
  },
};

// ─── Errors ───────────────────────────────────────────────────────────────────

/**
 * Error thrown for any non-2xx API response. Carries the HTTP status so callers
 * can distinguish an authentication failure (401) from a permission denial
 * (403) or a transient network/server error — important so we don't sign a
 * user out on a flaky launch, or because they tried to edit a partner's item.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }

  /** True for 401 — the token is missing, invalid, or expired. */
  get isAuthError(): boolean {
    return this.status === 401;
  }

  /** True for 403 — signed in, but not allowed to do this (e.g. not the creator). */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

/**
 * Parse a response body as JSON, tolerating non-JSON payloads.
 *
 * A reverse proxy (nginx) can return an HTML error page — e.g. a 413 "Request
 * Entity Too Large" for an oversized upload, or a 502/504 gateway page — before
 * the request ever reaches the API. Blindly running JSON.parse on that HTML
 * throws "unexpected char <", masking the real problem. Instead we detect a
 * non-JSON body and turn it into a clear ApiError keyed off the HTTP status.
 */
function parseJsonBody(status: number, contentType: string | null, text: string): unknown {
  if (!text) return null;

  const looksJson =
    (contentType?.includes('application/json') ?? false) ||
    text.trimStart().startsWith('{') ||
    text.trimStart().startsWith('[');

  if (!looksJson) {
    // The server (or a proxy in front of it) returned something that isn't JSON.
    throw new ApiError(status, messageForNonJson(status));
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(status, messageForNonJson(status));
  }
}

/** A human-friendly message for a non-JSON (usually proxy HTML) response. */
function messageForNonJson(status: number): string {
  switch (status) {
    case 413:
      return 'That file is too large to upload. Try a smaller image.';
    case 502:
    case 503:
    case 504:
      return 'The server is unavailable right now. Please try again in a moment.';
    default:
      return `Unexpected server response (HTTP ${status}).`;
  }
}

// ─── Silent token refresh ─────────────────────────────────────────────────────
// When a request comes back 401 (access token expired), we transparently
// exchange the refresh token for a new access token and retry the request once.
// The user only gets signed out if the refresh itself is rejected — so a session
// lasts until the refresh token expires or the user explicitly signs out.

// Endpoints that must never trigger a refresh-and-retry, to avoid infinite loops.
const AUTH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout'];

// Shared in-flight refresh so concurrent 401s trigger a single refresh call.
let _refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchange the stored refresh token for a new access + refresh token pair.
 * Returns true on success (new tokens stored), false if there is no refresh
 * token or the server rejected it (in which case tokens are cleared).
 * Concurrent callers share one in-flight request.
 */
function refreshAccessToken(): Promise<boolean> {
  if (_refreshInFlight) return _refreshInFlight;

  const attempt = (async (): Promise<boolean> => {
    const refreshToken = tokenStore.getRefresh();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // The refresh token is invalid/expired/revoked — the session is over.
        if (response.status === 401 || response.status === 403) {
          tokenStore.clear();
        }
        return false;
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!data?.accessToken || !data?.refreshToken) return false;

      tokenStore.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch (err) {
      // Network error — keep the tokens; the caller surfaces the original error.
      console.warn('Token refresh failed:', err);
      return false;
    }
  })();

  // Clear the shared promise once it settles so the next 401 can refresh again.
  _refreshInFlight = attempt;
  void attempt.finally(() => {
    _refreshInFlight = null;
  });
  return attempt;
}

// ─── Device date ──────────────────────────────────────────────────────────────

/**
 * Headers telling the server what day it is here.
 *
 * Anything that happens once a day — the check-in, opening the daily gift, a
 * streak — has to agree with the calendar on the user's own phone. The server
 * can't work that out from a UTC timestamp: at 1am in Auckland it is already
 * tomorrow, and at 11pm in Los Angeles it is still yesterday.
 *
 * Sent on every request from here rather than per call site, so a new endpoint
 * can't quietly forget them and fall back to the UTC day.
 */
const LOCAL_DATE_HEADER = 'X-Amori-Local-Date';
const UTC_OFFSET_HEADER = 'X-Amori-Utc-Offset-Minutes';

/** Today on this device, as "YYYY-MM-DD" in local time (never UTC). */
function localDateHeaderValue(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Minutes this device is *ahead* of UTC. `getTimezoneOffset()` reports the
 * opposite sign (minutes behind), hence the negation — and it reflects the
 * offset in force right now, so it follows daylight saving automatically.
 */
function utcOffsetHeaderValue(now: Date): string {
  return String(-now.getTimezoneOffset());
}

function deviceDateHeaders(): Record<string, string> {
  const now = new Date();
  return {
    [LOCAL_DATE_HEADER]: localDateHeaderValue(now),
    [UTC_OFFSET_HEADER]: utcOffsetHeaderValue(now),
  };
}

// ─── Core request helper ──────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function performRequest(
  path: string,
  method: HttpMethod,
  body: unknown,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...deviceDateHeaders(),
  };

  const token = tokenStore.get();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiRequest<T>(
  path: string,
  method: HttpMethod = 'GET',
  body?: unknown,
): Promise<T> {
  let response = await performRequest(path, method, body);

  // On a 401 for a normal request, try one silent refresh + retry before failing.
  if (response.status === 401 && !AUTH_PATHS.includes(path) && tokenStore.getRefresh()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await performRequest(path, method, body);
    }
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  // Guard against empty bodies (e.g. 401 with no JSON payload) and non-JSON
  // responses (e.g. an nginx HTML error page) — see parseJsonBody.
  const text = await response.text();
  const data = parseJsonBody(
    response.status,
    response.headers.get('content-type'),
    text,
  ) as { message?: string; title?: string } | null;

  if (!response.ok) {
    const message = data?.message ?? data?.title ?? `HTTP ${response.status}`;
    throw new ApiError(response.status, message);
  }

  // Actions that earn points carry a `rewards` envelope; hand it on so the
  // level badge and progress bar update immediately (see rewards.ts).
  rewardsEvents.publishFrom(data);

  return data as T;
}

// ─── Multipart upload helper ──────────────────────────────────────────────────

/** A local file to upload (as returned by expo-image-picker). */
export interface UploadFile {
  uri: string;
  /** MIME type, e.g. "image/jpeg". Defaults to image/jpeg if unknown. */
  type?: string;
  /** File name, e.g. "photo.jpg". */
  name?: string;
}

/**
 * Uploads a single file via multipart/form-data. Do NOT set Content-Type
 * manually — the runtime adds the correct multipart boundary. The field name
 * defaults to "file" to match the backend MediaController.
 */
export async function apiUpload<T>(
  path: string,
  file: UploadFile,
  fieldName = 'file',
): Promise<T> {
  const send = (): Promise<Response> => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...deviceDateHeaders(),
    };
    const token = tokenStore.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const form = new FormData();
    form.append(fieldName, {
      uri: file.uri,
      type: file.type ?? 'image/jpeg',
      name: file.name ?? 'upload.jpg',
      // React Native's FormData accepts this shape; cast for TS.
    } as unknown as Blob);

    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: form,
    });
  };

  let response = await send();

  // Silent refresh + retry once on an expired access token.
  if (response.status === 401 && !AUTH_PATHS.includes(path) && tokenStore.getRefresh()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await send();
    }
  }

  const text = await response.text();
  const data = parseJsonBody(
    response.status,
    response.headers.get('content-type'),
    text,
  ) as { message?: string; title?: string } | null;

  if (!response.ok) {
    const message = data?.message ?? data?.title ?? `HTTP ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return data as T;
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, 'GET'),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, 'POST', body),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, 'PATCH', body),
  delete: <T>(path: string) => apiRequest<T>(path, 'DELETE'),
  upload: <T>(path: string, file: UploadFile, fieldName?: string) =>
    apiUpload<T>(path, file, fieldName),
};
