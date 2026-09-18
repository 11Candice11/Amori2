/**
 * Amori API client.
 *
 * Uses the native fetch API — no external HTTP library needed.
 * The access token is cached in memory and persisted to disk (expo-file-system)
 * so the session survives app restarts until the user signs out.
 *
 * In development:   http://10.0.2.2:5000  (Android emulator → host machine)
 * In production:    https://api.amori.app
 */

// ── API host selection ────────────────────────────────────────────────────────
// The backend is hosted on EC2, reachable over the internet, so both the
// emulator and a physical device use the same host — no more Mac-LAN/10.0.2.2
// juggling. Switch DEV_TARGET to run against a local backend instead.
//
//   'ec2'      → hosted backend at EC2_HOST (works anywhere)
//   'emulator' → local backend via the Android emulator alias 10.0.2.2
//   'lan'      → local backend via the Mac's LAN IP (physical device on same WiFi)
type DevTarget = 'ec2' | 'emulator' | 'lan';
const DEV_TARGET: DevTarget = 'ec2';

const EC2_HOST = '51.20.141.199'; // Amori EC2 (eu-north-1)
const LAN_HOST = '192.168.1.51';   // Mac's local IP (update if your network changes)

const DEV_HOST =
  DEV_TARGET === 'ec2' ? EC2_HOST : DEV_TARGET === 'lan' ? LAN_HOST : '10.0.2.2';

// NOTE: production currently points at the EC2 host over plain HTTP. This
// requires an iOS App Transport Security exception for 51.20.141.199 (see
// ios/Amori/Info.plist) and an Android cleartext permit (see AndroidManifest).
// Move to HTTPS (api.amori.app) before shipping to real users.
const PROD_HOST = '51.20.141.199';

const BASE_URL = __DEV__
  ? `http://${DEV_HOST}:5001`
  : `http://${PROD_HOST}:5001`;

// ─── Persistent token store ─────────────────────────────────────────────────
// The token is cached in memory for synchronous access (request headers) and
// mirrored to a small file in the app's document directory so the user stays
// signed in across app restarts — until they explicitly sign out. Mirrors the
// best-effort `expo-file-system` approach used by themeStore; persistence
// failures never crash the app, they just mean the session won't survive a
// restart.
import * as FileSystem from 'expo-file-system';

const TOKEN_FILE_NAME = 'auth-token.json';
let _accessToken: string | null = null;

function tokenFileUri(): string | null {
  const dir = FileSystem.documentDirectory;
  return dir ? `${dir}${TOKEN_FILE_NAME}` : null;
}

async function persistToken(token: string | null): Promise<void> {
  const uri = tokenFileUri();
  if (!uri) return;
  try {
    if (token) {
      await FileSystem.writeAsStringAsync(uri, JSON.stringify({ accessToken: token }));
    } else {
      // Delete on sign-out so no stale token lingers on disk.
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // Ignore — a failed write/delete just means the change won't persist.
  }
}

export const tokenStore = {
  /** Synchronous read of the in-memory token (used for request headers). */
  get: () => _accessToken,

  /** Set the token in memory and mirror it to disk (best-effort). */
  set: (token: string | null) => {
    _accessToken = token;
    void persistToken(token);
  },

  /** Clear the token from memory and delete the persisted copy. */
  clear: () => {
    _accessToken = null;
    void persistToken(null);
  },

  /**
   * Hydrate the in-memory token from disk. Call once at app startup, before
   * checking authentication, so a previously signed-in user stays signed in.
   * Returns the restored token (or null when none was stored).
   */
  async hydrate(): Promise<string | null> {
    const uri = tokenFileUri();
    if (!uri) return null;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) return null;
      const raw = await FileSystem.readAsStringAsync(uri);
      const parsed = JSON.parse(raw) as { accessToken?: unknown };
      _accessToken = typeof parsed.accessToken === 'string' ? parsed.accessToken : null;
      return _accessToken;
    } catch {
      return null;
    }
  },
};

// ─── Core request helper ──────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export async function apiRequest<T>(
  path: string,
  method: HttpMethod = 'GET',
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const token = tokenStore.get();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  // Guard against empty bodies (e.g. 401 with no JSON payload)
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message ?? data?.title ?? `HTTP ${response.status}`;
    throw new Error(message);
  }

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
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenStore.get();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const form = new FormData();
  form.append(fieldName, {
    uri: file.uri,
    type: file.type ?? 'image/jpeg',
    name: file.name ?? 'upload.jpg',
    // React Native's FormData accepts this shape; cast for TS.
  } as unknown as Blob);

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: form,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message ?? data?.title ?? `HTTP ${response.status}`;
    throw new Error(message);
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
