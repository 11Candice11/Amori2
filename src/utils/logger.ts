/**
 * Minimal dev logger.
 *
 * All output is gated on __DEV__ so nothing leaks to production builds.
 * Use the named helpers (log, warn, error) to tag messages with a prefix
 * so they're easy to filter in the Metro / Xcode / logcat console.
 */

const PREFIX = '[Amori]';

function fmt(tag: string, message: string, ...args: unknown[]): [string, ...unknown[]] {
  return [`${PREFIX} [${tag}] ${message}`, ...args];
}

export const logger = {
  log(tag: string, message: string, ...args: unknown[]): void {
    if (__DEV__) console.log(...fmt(tag, message, ...args));
  },

  warn(tag: string, message: string, ...args: unknown[]): void {
    if (__DEV__) console.warn(...fmt(tag, message, ...args));
  },

  error(tag: string, message: string, ...args: unknown[]): void {
    if (__DEV__) console.error(...fmt(tag, message, ...args));
  },
};
