/**
 * src/services/globalErrorHandlers.ts
 *
 * Global error handling setup for unhandled promise rejections,
 * network errors, and other runtime exceptions.
 */

import {
  captureException,
  captureMessage,
  sanitizeErrorForTelemetry,
} from "@/src/services/errorTracking";

type PromiseRejectionHandler = (event: PromiseRejectionEvent) => void;

type ErrorUtilsLike = {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: Error, isFatal: boolean) => void) => void;
};

type PerformanceWithMemory = Performance & {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
  };
};

type GlobalWithHandlers = typeof globalThis & {
  onunhandledrejection?: PromiseRejectionHandler;
  ErrorUtils?: ErrorUtilsLike;
  performance?: PerformanceWithMemory;
};

const globalObj = globalThis as GlobalWithHandlers;

/**
 * Setup global error handlers for the application
 */
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  if (typeof globalObj !== "undefined") {
    const originalHandler = globalObj.onunhandledrejection;
    globalObj.onunhandledrejection = (event: PromiseRejectionEvent) => {
      const safeReason =
        event.reason instanceof Error
          ? sanitizeErrorForTelemetry(event.reason)
          : { name: "UnhandledRejection", message: "Unhandled promise rejection" };
      console.error("[Global] Unhandled promise rejection:", safeReason);

      // Report to error tracking
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      captureException(error, {
        screen: "global",
        action: "unhandled_promise_rejection",
        global: true,
      });

      // Call original handler if it exists
      if (originalHandler) {
        originalHandler(event);
      }

      // Prevent default warning in console
      event.preventDefault();
    };
  }

  // Handle other global errors
  if (
    typeof globalObj !== "undefined" &&
    typeof globalObj.ErrorUtils !== "undefined"
  ) {
    const originalHandler = globalObj.ErrorUtils.getGlobalHandler();
    globalObj.ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
      console.error("[Global] Uncaught JS error:", {
        ...sanitizeErrorForTelemetry(error),
        isFatal,
      });

      captureException(error, {
        screen: "global",
        action: "uncaught_js_error",
        fatal: isFatal,
        global: true,
      });

      // Call original handler
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }

  // Setup network error monitoring
  setupNetworkErrorMonitoring();

  // Setup performance monitoring
  setupPerformanceMonitoring();

  console.log("[Global] Error handlers initialized");
}

/**
 * Monitor network errors and connectivity issues
 */
function setupNetworkErrorMonitoring() {
  // Monitor fetch errors
  const originalFetch = global.fetch;
  globalObj.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);

      // Monitor failed HTTP responses
      if (!response.ok && response.status >= 500) {
        captureMessage(
          `Network error: ${response.status} ${response.statusText}`,
          "warning",
          {
            screen: "global",
            action: "network_error",
            url: args[0] as string,
            status: response.status,
            statusText: response.statusText,
          },
        );
      }

      return response;
    } catch (error) {
      // Monitor network failures
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          screen: "global",
          action: "fetch_error",
          url: args[0] as string,
        },
      );
      throw error;
    }
  };
}

/**
 * Monitor app performance and slow operations
 */
function setupPerformanceMonitoring() {
  // Monitor slow render cycles (React Native specific)
  if (typeof global.requestIdleCallback === "function") {
    let slowRenderCount = 0;
    const checkRenderPerformance = () => {
      const start = Date.now();
      globalObj.requestIdleCallback?.(() => {
        const renderTime = Date.now() - start;
        if (renderTime > 100) {
          // Slow render threshold
          slowRenderCount++;
          if (slowRenderCount % 5 === 0) {
            // Report every 5th slow render
            captureMessage(`Slow render detected: ${renderTime}ms`, "warning", {
              screen: "global",
              action: "slow_render",
              renderTime,
              slowRenderCount,
            });
          }
        }
      });
    };

    // Check performance every 5 seconds
    setInterval(checkRenderPerformance, 5000);
  }

  // Monitor memory usage (if available)
  if (typeof globalObj.performance !== "undefined" && globalObj.performance.memory) {
    setInterval(() => {
      const memory = globalObj.performance?.memory;
      if (!memory) return;
      const memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;

      if (memoryUsage > 0.9) {
        // 90% memory usage
        captureMessage(
          `High memory usage detected: ${Math.round(memoryUsage * 100)}%`,
          "warning",
          {
            screen: "global",
            action: "high_memory_usage",
            memoryUsage: Math.round(memoryUsage * 100),
            usedHeapSize: memory.usedJSHeapSize,
            totalHeapSize: memory.totalJSHeapSize,
          },
        );
      }
    }, 30000); // Check every 30 seconds
  }
}

/**
 * Create a safe async wrapper that catches and reports errors
 */
export function createSafeAsyncWrapper<
  T extends (...args: any[]) => Promise<any>,
>(fn: T, context: string): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          screen: "global",
          action: "safe_async_wrapper",
          context,
        },
      );
      throw error; // Re-throw to maintain expected behavior
    }
  }) as T;
}

/**
 * Create a safe sync wrapper that catches and reports errors
 */
export function createSafeSyncWrapper<T extends (...args: any[]) => any>(
  fn: T,
  context: string,
): T {
  return ((...args: Parameters<T>) => {
    try {
      return fn(...args);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          screen: "global",
          action: "safe_sync_wrapper",
          context,
        },
      );
      throw error; // Re-throw to maintain expected behavior
    }
  }) as T;
}

/**
 * Report app lifecycle events for debugging
 */
export function reportAppLifecycleEvent(
  event: string,
  data?: Record<string, unknown>,
) {
  captureMessage(`App lifecycle: ${event}`, "info", {
    screen: "global",
    action: "app_lifecycle",
    lifecycleEvent: event,
    ...data,
  });
}
