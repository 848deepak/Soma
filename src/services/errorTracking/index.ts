/**
 * src/services/errorTracking/index.ts
 *
 * Thin wrapper around @sentry/react-native.
 *
 * Responsibilities:
 *   - One-time initialisation with sanitised options.
 *   - Capture unhandled exceptions and explicit messages.
 *   - Attach / clear Sentry user context on auth state changes.
 *
 * The wrapper is kept intentionally thin so it is easy to swap out the
 * underlying provider without touching call-sites across the app.
 */
import * as Sentry from '@sentry/react-native';

type SeverityLevel = 'info' | 'warning' | 'error';

let initialised = false;

/**
 * Initialise Sentry.  Safe to call multiple times – subsequent calls are
 * ignored.
 * @param dsn The Sentry Data Source Name for this project.
 */
export function initSentry(dsn: string): void {
  if (initialised) return;
  Sentry.init({
    dsn,
    // Capture 20 % of transactions for performance monitoring in production.
    tracesSampleRate: 0.2,
    // Never send personally-identifiable data.
    sendDefaultPii: false,
  });
  initialised = true;
}

/**
 * Reports an exception to Sentry.
 * Accepts any value that was `throw`n – Error objects, strings, or unknown.
 */
export function captureException(error: unknown): void {
  Sentry.captureException(error);
}

/**
 * Reports a diagnostic message to Sentry.
 * @param message Human-readable text.
 * @param level   Severity level (default 'info').
 */
export function captureMessage(
  message: string,
  level: SeverityLevel = 'info',
): void {
  Sentry.captureMessage(message, level);
}

/**
 * Attaches the current user to future Sentry events.
 * Call this after a successful sign-in or when the anonymous session resolves.
 * @param id          The user's UUID (anonymous or email-derived).
 * @param isAnonymous Whether this is a guest session.
 */
export function setUser(id: string, isAnonymous: boolean): void {
  Sentry.setUser({ id, username: isAnonymous ? 'anonymous' : undefined });
}

/** Clears the user context – call on sign-out. */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Resets the initialisation guard.
 * Exported for unit-test isolation only – do not call in production code.
 */
export function _resetInitFlag(): void {
  initialised = false;
}
