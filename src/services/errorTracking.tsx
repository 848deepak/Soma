/**
 * src/services/errorTracking.ts
 * Centralized error tracking and logging service.
 *
 * Features:
 * - Sentry integration for production error tracking
 * - Local console logging for development
 * - User-friendly error recovery suggestions
 * - Performance monitoring
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";

interface ErrorMetadata {
  userId?: string;
  screen?: string;
  action?: string;
  cycleDay?: number;
  timestamp?: string;
  [key: string]: unknown;
}

const SENSITIVE_KEY_PATTERN =
  /(token|password|authorization|cookie|session|secret|key|email|phone|notes?|symptom|flow|cycle|dob|birth|address)/i;

function redactValue(value: unknown): unknown {
  if (value == null) return value;

  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized.length === 0) return value;
    if (normalized.length > 120) return "[REDACTED_LONG_TEXT]";
    if (/^eyJ[A-Za-z0-9_-]+\./.test(normalized)) return "[REDACTED_TOKEN]";
    if (/^[A-Za-z0-9_-]{28,}$/.test(normalized)) return "[REDACTED_SECRET]";
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 5).map((item) => redactValue(item));
  }

  if (typeof value === "object") {
    return sanitizeMetadata(value as Record<string, unknown>);
  }

  return value;
}

function sanitizeMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }
    sanitized[key] = redactValue(value);
  }

  return sanitized;
}

function sanitizeError(error: Error): { name: string; message: string } {
  const safeMessage =
    error.message.length > 240
      ? `${error.message.slice(0, 240)}...`
      : error.message;
  return {
    name: error.name || "Error",
    message: safeMessage,
  };
}

interface PerformanceMetric {
  name: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

class ErrorTrackingService {
  private isInitialized = false;
  private isDevelopment = __DEV__;

  /**
   * Initialize error tracking with Sentry DSN
   */
  init(dsn?: string) {
    if (this.isInitialized) return;

    if (dsn && !this.isDevelopment) {
      Sentry.init({
        dsn,
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000,
        enableAutoPerformanceTracing: true,
        tracesSampleRate: 0.1, // 10% sampling for performance
      });
    }

    this.isInitialized = true;
    this.log("info", "Error tracking initialized", {
      environment: this.isDevelopment ? "development" : "production",
      hasSentry: Boolean(dsn),
    });
  }

  /**
   * Capture and report an exception
   */
  captureException(error: Error, metadata: ErrorMetadata = {}) {
    const sanitizedMetadata = sanitizeMetadata(metadata);
    const enhancedError = this.enhanceErrorContext(error, sanitizedMetadata);
    const safeError = sanitizeError(error);

    if (this.isDevelopment) {
      console.error("[ErrorTracking] Exception:", safeError.message, {
        name: safeError.name,
        metadata: sanitizedMetadata,
      });
    } else {
      Sentry.withScope((scope) => {
        // Add user context
        if (typeof metadata.userId === "string" && metadata.userId.length > 0) {
          scope.setUser({ id: metadata.userId });
        }

        // Add custom tags
        scope.setTag("screen", String(metadata.screen || "unknown"));
        scope.setTag("action", String(metadata.action || "unknown"));

        // Add extra context
        scope.setContext("metadata", sanitizedMetadata);
        scope.setContext("app_state", {
          timestamp: new Date().toISOString(),
          cycleDay: metadata.cycleDay,
        });

        Sentry.captureException(enhancedError);
      });
    }

    // Store error locally for offline review
    this.storeErrorLocally(enhancedError, sanitizedMetadata);
  }

  /**
   * Capture a custom message
   */
  captureMessage(
    message: string,
    level: "info" | "warning" | "error" = "info",
    metadata: ErrorMetadata = {},
  ) {
    const sanitizedMetadata = sanitizeMetadata(metadata);

    if (this.isDevelopment) {
      console.log(
        `[ErrorTracking] ${level.toUpperCase()}: ${message}`,
        sanitizedMetadata,
      );
    } else {
      Sentry.withScope((scope) => {
        if (metadata.userId) {
          scope.setUser({ id: metadata.userId });
        }
        scope.setContext("metadata", sanitizedMetadata);
        Sentry.captureMessage(message, level);
      });
    }
  }

  /**
   * Set user context for error tracking
   */
  setUser(userId: string, email?: string) {
    if (!this.isDevelopment) {
      Sentry.setUser({
        id: userId,
        email,
      });
    }
  }

  /**
   * Clear user context from Sentry
   */
  clearUser() {
    if (!this.isDevelopment) {
      Sentry.setUser(null);
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: PerformanceMetric) {
    if (this.isDevelopment) {
      console.log(
        `[Performance] ${metric.name}: ${metric.duration}ms`,
        metric.metadata,
      );
    } else {
      Sentry.addBreadcrumb({
        message: `Performance: ${metric.name}`,
        level: "info",
        data: {
          duration: metric.duration,
          ...metric.metadata,
        },
      });
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, data?: Record<string, unknown>) {
    if (!this.isDevelopment) {
      Sentry.addBreadcrumb({
        message,
        level: "info",
        data,
      });
    }
  }

  /**
   * Enhanced logging with structured data
   */
  private log(
    level: "info" | "warn" | "error",
    message: string,
    data?: Record<string, unknown>,
  ) {
    if (this.isDevelopment) {
      const logFn =
        level === "error"
          ? console.error
          : level === "warn"
            ? console.warn
            : console.log;
      logFn(`[ErrorTracking] ${message}`, data);
    }
  }

  /**
   * Enhance error with additional context
   */
  private enhanceErrorContext(error: Error, metadata: ErrorMetadata): Error {
    const safeError = sanitizeError(error);
    const enhanced = new Error(error.message);
    enhanced.name = safeError.name;
    enhanced.stack = this.isDevelopment ? error.stack : undefined;

    // Add metadata to error object
    Object.assign(enhanced, {
      metadata,
      timestamp: new Date().toISOString(),
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    });

    return enhanced;
  }

  /**
   * Store error locally for offline analysis
   */
  private async storeErrorLocally(error: Error, metadata: ErrorMetadata) {
    try {
      const errorLog = {
        id: Date.now().toString(),
        message: error.message,
        metadata: sanitizeMetadata(metadata),
        timestamp: new Date().toISOString(),
      };

      const existingLogs = await AsyncStorage.getItem("error_logs");
      const logs = existingLogs ? JSON.parse(existingLogs) : [];

      // Keep only last 50 errors
      const updatedLogs = [errorLog, ...logs.slice(0, 49)];

      await AsyncStorage.setItem("error_logs", JSON.stringify(updatedLogs));
    } catch (storageError) {
      console.warn("[ErrorTracking] Failed to store error locally");
    }
  }

  /**
   * Get locally stored errors for debugging
   */
  async getStoredErrors() {
    try {
      const errorLogs = await AsyncStorage.getItem("error_logs");
      return errorLogs ? JSON.parse(errorLogs) : [];
    } catch (error) {
      console.warn("[ErrorTracking] Failed to retrieve stored errors:", error);
      return [];
    }
  }

  /**
   * Clear locally stored errors
   */
  async clearStoredErrors() {
    try {
      await AsyncStorage.removeItem("error_logs");
    } catch (error) {
      console.warn("[ErrorTracking] Failed to clear stored errors:", error);
    }
  }
}

// Singleton instance
const errorTrackingService = new ErrorTrackingService();

/**
 * Initialize error tracking (called from app initialization)
 */
export function initSentry(dsn: string) {
  errorTrackingService.init(dsn);
}

/**
 * Capture an exception with context
 */
export function captureException(error: Error, metadata: ErrorMetadata = {}) {
  errorTrackingService.captureException(error, metadata);
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  metadata: ErrorMetadata = {},
) {
  errorTrackingService.captureMessage(message, level, metadata);
}

/**
 * Set user context
 */
export function setUser(userId: string, email?: string) {
  errorTrackingService.setUser(userId, email);
}

/**
 * Track performance metrics
 */
export function trackPerformance(metric: PerformanceMetric) {
  errorTrackingService.trackPerformance(metric);
}

/**
 * Add debugging breadcrumb
 */
export function addBreadcrumb(message: string, data?: Record<string, unknown>) {
  errorTrackingService.addBreadcrumb(
    message,
    data ? sanitizeMetadata(data) : undefined,
  );
}

export function sanitizeErrorForTelemetry(error: Error): {
  name: string;
  message: string;
} {
  return sanitizeError(error);
}

/**
 * Performance timer utility
 */
export function createPerformanceTimer(name: string) {
  const start = Date.now();

  return {
    finish: (metadata?: Record<string, unknown>) => {
      const duration = Date.now() - start;
      trackPerformance({ name, duration, metadata });
      return duration;
    },
  };
}

/**
 * Error boundary helper for React components
 */
export function withErrorTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
): React.ComponentType<P> {
  return function WrappedComponent(props: P) {
    try {
      return <Component {...props} />;
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          screen: componentName,
          action: "render",
        },
      );
      throw error; // Re-throw to trigger error boundary
    }
  };
}

// Test utilities
let initFlag = false;

export function clearUser() {
  errorTrackingService.clearUser();
}

export function _resetInitFlag() {
  initFlag = false;
}

export default errorTrackingService;
