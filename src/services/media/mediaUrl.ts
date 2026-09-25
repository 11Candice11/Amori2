/**
 * mediaUrl — normalize server-provided media URLs so the client can load them.
 *
 * The backend builds public upload URLs from the incoming request scheme. Behind
 * nginx (which terminates TLS and proxies to the API over plain HTTP) that scheme
 * is "http" unless the API honours X-Forwarded-Proto — so responses can carry
 * `http://amori.ycare.org/uploads/…`. React Native's <Image> won't follow the
 * 301→https redirect and iOS ATS blocks cleartext, so those images silently fail.
 *
 * This upgrades an insecure URL for the hosted backend host to https. Local dev
 * origins (LAN IPs, the 10.0.2.2 emulator alias, localhost) are left untouched —
 * they are legitimately served over cleartext and have no https listener.
 */

/** Hosts whose http:// URLs should be upgraded to https://. */
const SECURE_HOSTS = ['amori.ycare.org'];

/**
 * Return a loadable URL for a media resource. Upgrades http→https for known
 * secure hosts; returns other values unchanged. Nullish/empty input passes
 * through so callers can keep their own "has url" checks.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return url ?? '';
  if (!url.startsWith('http://')) return url;

  const host = hostOf(url);
  if (host && SECURE_HOSTS.includes(host)) {
    return 'https://' + url.slice('http://'.length);
  }
  return url;
}

/** Extract the host (no port) from an http(s) URL, or null if unparseable. */
function hostOf(url: string): string | null {
  const match = /^https?:\/\/([^/:]+)/i.exec(url);
  return match ? match[1].toLowerCase() : null;
}
