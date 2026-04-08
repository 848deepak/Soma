/**
 * src/platform/monitoring/logger.ts
 *
 * Centralized structured logging for the Soma app.
 *
 * Usage:
 *   import { log } from '@/platform/monitoring/logger';
 *
 *   log({
 *     level: 'info',
 *     category: 'auth',
 *     message: 'User signed in',
 *     meta: { userId: '123' },
 *   });
 *
 * In dev: logs to console with full JSON structure.
 * In prod: sends to configured monitoring service (Sentry, Datadog, PostHog).
 *
 * Fire-and-forget: Never await log() in UI critical paths.
 */

import { Platform } from 'react-native';
import type * as SentryType from '@sentry/react-native';

declare global {
  var Sentry: (typeof SentryType) | undefined;
  var posthog: { capture: (event: string, props: Record<string, unknown>) => void } | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogCategory =
  | 'auth'
  | 'data'
  | 'navigation'
  | 'performance'
  | 'error'
  | 'network'
  | 'storage'
  | 'validation'
  | 'ui'
  | 'analytics'
  | 'audit'
  | 'error_tracking'
  | 'notifications'
  | 'offline_queue'
  | 'store';

export interface LogEvent {
  level: LogLevel;
  category: LogCategory;
  message: string;
  meta?: Record<string, unknown>;
  userId?: string;
  timestamp: string;
  platform?: string;
  buildNumber?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal state
// ─────────────────────────────────────────────────────────────────────────────

let monitoringServiceReady = false;
let userId: string | undefined;

/**
 * Initialize the monitoring service.
 * Call this during app bootstrap (in _layout.tsx or AppBootstrap).
 * This runs Sentry and PostHog initialization.
 */
export function initializeMonitoring() {
  monitoringServiceReady = true;
  // Sentry and PostHog are already initialized in _layout.tsx
  // This is here for explicit monitoring initialization if needed
}

/**
 * Set the current user ID for monitoring context.
 * Call after successful authentication.
 */
export function setMonitoringUserId(id: string | undefined) {
  userId = id;
  if (userId && typeof Sentry !== 'undefined') {
    try {
      Sentry.setUser({ id: userId });
    } catch (e) {
      // Sentry not initialized, safe to ignore
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fire-and-forget logging
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main logging function - fire-and-forget.
 * Never await this in UI critical paths.
 *
 * Mandatory log events:
 *
 * Auth:
 *   - storage_selected
 *   - session_restored
 *   - bootstrap_routed
 *   - sign_in
 *   - sign_out
 *
 * Data:
 *   - bootstrap_rpc_success
 *   - bootstrap_rpc_fail
 *   - query_cache_hit
 *   - offline_queue_flush
 *
 * Performance:
 *   - bootstrap_duration_ms
 *   - calendar_render_ms
 *
 * Error:
 *   - unhandled_exception
 *   - rls_denied
 *   - network_timeout
 */

export function log(event: Omit<LogEvent, 'timestamp'>) {
  const fullEvent: LogEvent = {
    ...event,
    userId: event.userId || userId,
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
  };

  // Dev: log to console (synchronous, easier debugging)
  if (__DEV__) {
    const levelColors = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m', // green
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    const color = levelColors[fullEvent.level];
    console.log(
      `${color}[SOMA:${fullEvent.category}] ${fullEvent.message}${reset}`,
      fullEvent.meta ? fullEvent.meta : ''
    );
  } else {
    // Prod: send to monitoring service (async, non-blocking)
    sendToMonitoringService(fullEvent);
  }
}

/**
 * Send log event to configured monitoring service.
 * This is async and non-blocking - errors are silently caught.
 */
function sendToMonitoringService(event: LogEvent) {
  // Fire-and-forget: don't await
  (async () => {
    try {
      // Sentry is available if initialized
      if (typeof Sentry !== 'undefined') {
        // For error levels, use captureException; otherwise use captureMessage
        if (event.level === 'error') {
          Sentry.captureMessage(event.message, 'error');
        } else if (event.level === 'warn') {
          Sentry.captureMessage(event.message, 'warning');
        } else {
          Sentry.captureMessage(event.message, 'info');
        }

        // Add metadata to Sentry context
        if (event.meta) {
          Sentry.setContext(event.category, event.meta);
        }
        if (event.userId) {
          Sentry.setUser({ id: event.userId });
        }
      }

      // PostHog is available if initialized
      if (typeof posthog !== 'undefined') {
        posthog.capture(event.message, {
          level: event.level,
          category: event.category,
          ...event.meta,
          timestamp: event.timestamp,
        });
      }

      // Additional: Could send to custom endpoint if needed
      // await fetch(MONITORING_ENDPOINT, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event),
      // });
    } catch (err) {
      // Silently fail - logging should never crash the app
      if (__DEV__) {
        console.error('Failed to send log event:', err);
      }
    }
  })();
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience functions for common log patterns
// ─────────────────────────────────────────────────────────────────────────────

export function logDebug(
  category: LogCategory,
  message: string,
  meta?: Record<string, unknown>
) {
  log({ level: 'debug', category, message, meta });
}

export function logInfo(
  category: LogCategory,
  message: string,
  meta?: Record<string, unknown>
) {
  log({ level: 'info', category, message, meta });
}

export function logWarn(
  category: LogCategory,
  message: string,
  meta?: Record<string, unknown>
) {
  log({ level: 'warn', category, message, meta });
}

export function logError(
  category: LogCategory,
  message: string,
  meta?: Record<string, unknown>
) {
  log({ level: 'error', category, message, meta });
}

/**
 * Log a performance measurement (in milliseconds).
 * Example: logPerformance('bootstrap_duration_ms', 523, { step: 'cache_restore' })
 */
export function logPerformance(
  eventName: string,
  durationMs: number,
  meta?: Record<string, unknown>
) {
  log({
    level: 'info',
    category: 'performance',
    message: eventName,
    meta: {
      durationMs,
      ...meta,
    },
  });
}

/**
 * Log an auth event.
 */
export function logAuthEvent(
  eventName: string,
  meta?: Record<string, unknown>
) {
  log({
    level: 'info',
    category: 'auth',
    message: eventName,
    meta,
  });
}

/**
 * Log a data synchronization event.
 */
export function logDataEvent(
  eventName: string,
  meta?: Record<string, unknown>
) {
  log({
    level: 'info',
    category: 'data',
    message: eventName,
    meta,
  });
}

/**
 * Log a validation error.
 */
export function logValidationError(
  message: string,
  meta?: Record<string, unknown>
) {
  log({
    level: 'warn',
    category: 'validation',
    message,
    meta,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Global error handler integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log an unhandled exception (called by global error handler).
 */
export function logUnhandledError(
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  const message = error instanceof Error ? error.message : String(error);
  log({
    level: 'error',
    category: 'error',
    message: 'unhandled_exception',
    meta: {
      errorMessage: message,
      errorStack: error instanceof Error ? error.stack : undefined,
      ...context,
    },
  });
}
