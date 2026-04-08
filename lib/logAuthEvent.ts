/**
 * lib/logAuthEvent.ts
 * Structured logging for authentication events.
 *
 * In dev: logs to console.
 * In prod: emits to analytics/monitoring service.
 */

export interface AuthEventPayload {
  type:
    | "storage_selected"
    | "session_restore"
    | "bootstrap_routing"
    | "upgrade_attempt"
    | "upgrade_fallback"
    | "profile_repair_start"
    | "profile_repair_success"
    | "profile_repair_failure";
  backend?: "ios" | "android" | "web";
  success?: boolean;
  userId?: string;
  reason?: "onboarded" | "needs_onboarding" | "profile_repair" | "anonymous" | string;
  route?: string;
  error?: string;
  attemptCount?: number;
  durationMs?: number;
}

const isDev = __DEV__;

/**
 * Emit an auth event.
 * In development, logs structured JSON to console.
 * In production, sends to analytics/error tracking service.
 */
export function logAuthEvent(payload: AuthEventPayload): void {
  const timestamp = new Date().toISOString();
  const event = {
    timestamp,
    ...payload,
  };

  if (isDev) {
    console.log("[Auth Event]", JSON.stringify(event, null, 2));
  } else {
    // In production, send to Sentry, PostHog, or your monitoring service
    // Example: Sentry.captureMessage(JSON.stringify(event), 'info');
    // For now, still log in production for debugging
    console.log("[Auth Event]", JSON.stringify(event));
  }
}
