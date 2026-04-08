/**
 * src/services/analytics.ts
 * Analytics service for tracking user interactions and app usage.
 *
 * Features:
 * - PostHog integration for product analytics
 * - Privacy-first tracking with user consent
 * - Custom event tracking for cycle-related actions
 * - Performance and engagement metrics
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import PostHog from "posthog-react-native";
import { captureException } from "./errorTracking";
import { logInfo } from "@/platform/monitoring/logger";

type PostHogStatic = {
  initPostHog?: (apiKey: string, options: Record<string, unknown>) => Promise<void>;
  getFeatureFlag?: (key: string) => Promise<unknown> | unknown;
  reset?: () => void;
  identify?: (userId: string, properties?: Record<string, unknown>) => void;
  capture?: (event: string, properties?: Record<string, unknown>) => void;
  group?: (type: string, properties: Record<string, unknown>) => void;
};

const posthog = PostHog as unknown as PostHogStatic;

interface UserProperties {
  cycleLength?: number;
  periodLength?: number;
  age?: number;
  onboardingCompleted?: boolean;
  hasPartner?: boolean;
  [key: string]: unknown;
}

interface EventProperties {
  screen?: string;
  action?: string;
  cycleDay?: number;
  phase?: string;
  timestamp?: string;
  [key: string]: unknown;
}

const ANALYTICS_CONSENT_KEY = "analytics_consent";

class AnalyticsService {
  private isInitialized = false;
  private hasConsent = false;
  private pendingEvents: Array<{ event: string; properties: EventProperties }> =
    [];

  /**
   * Initialize analytics with PostHog
   */
  async init(apiKey?: string) {
    if (this.isInitialized) return;

    try {
      // Check for user consent
      const consent = await AsyncStorage.getItem(ANALYTICS_CONSENT_KEY);
      this.hasConsent = consent === "true";

      if (apiKey && this.hasConsent) {
        if (typeof posthog.initPostHog !== "function") {
          this.isInitialized = true;
          this.flushPendingEvents();
          return;
        }

        await posthog.initPostHog(apiKey, {
          host: "https://app.posthog.com",
          captureApplicationLifecycleEvents: true,
          captureDeepLinks: true,
          recordScreenViews: true,
          enableSessionRecording: false, // Respect privacy
        });

        logInfo('analytics', 'posthog_initialized', {
          host: 'https://app.posthog.com',
        });
      }

      this.isInitialized = true;

      // Process any pending events
      this.flushPendingEvents();
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { action: "analytics_init" },
      );
    }
  }

  /**
   * Request analytics consent from user
   */
  async requestConsent(): Promise<boolean> {
    try {
      // In a real app, show a consent dialog here
      // For now, default to opt-in for existing users
      await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, "true");
      this.hasConsent = true;

      if (this.isInitialized && this.hasConsent) {
        this.flushPendingEvents();
      }

      return true;
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { action: "analytics_consent" },
      );
      return false;
    }
  }

  /**
   * Revoke analytics consent
   */
  async revokeConsent() {
    try {
      await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, "false");
      this.hasConsent = false;

      if (typeof posthog.getFeatureFlag === "function") {
        posthog.reset?.();
      }
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { action: "analytics_revoke_consent" },
      );
    }
  }

  /**
   * Identify user with properties
   */
  identify(userId: string, properties: UserProperties = {}) {
    if (!this.hasConsent) return;

    try {
      posthog.identify?.(userId, properties);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { action: "analytics_identify", userId },
      );
    }
  }

  /**
   * Track a custom event
   */
  track(event: string, properties: EventProperties = {}) {
    const enrichedProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
      platform: "mobile",
    };

    if (!this.hasConsent || !this.isInitialized) {
      // Queue event for later if consent is needed
      this.pendingEvents.push({ event, properties: enrichedProperties });
      return;
    }

    try {
      posthog.capture?.(event, enrichedProperties);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { action: "analytics_track", event },
      );
    }
  }

  /**
   * Track screen view
   */
  screen(screenName: string, properties: EventProperties = {}) {
    this.track("Screen View", {
      screen: screenName,
      ...properties,
    });
  }

  /**
   * Track cycle-related events
   */
  trackCycleEvent(action: string, properties: EventProperties = {}) {
    this.track("Cycle Action", {
      action,
      category: "cycle",
      ...properties,
    });
  }

  /**
   * Track user engagement
   */
  trackEngagement(action: string, properties: EventProperties = {}) {
    this.track("User Engagement", {
      action,
      category: "engagement",
      ...properties,
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(
    metric: string,
    duration: number,
    properties: EventProperties = {},
  ) {
    this.track("Performance Metric", {
      metric,
      duration,
      category: "performance",
      ...properties,
    });
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: UserProperties) {
    if (!this.hasConsent) return;

    try {
      posthog.group?.("user", properties);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { action: "analytics_set_properties" },
      );
    }
  }

  /**
   * Process queued events when consent is granted
   */
  private flushPendingEvents() {
    if (!this.hasConsent || !this.isInitialized) return;

    while (this.pendingEvents.length > 0) {
      const { event, properties } = this.pendingEvents.shift()!;
      this.track(event, properties);
    }
  }

  /**
   * Get analytics consent status
   */
  async getConsentStatus(): Promise<boolean> {
    try {
      const consent = await AsyncStorage.getItem(ANALYTICS_CONSENT_KEY);
      return consent === "true";
    } catch {
      return false;
    }
  }
}

// Singleton instance
const analyticsService = new AnalyticsService();

/**
 * Initialize analytics (called from app initialization)
 */
export function initAnalytics(apiKey: string) {
  analyticsService.init(apiKey);
}

/**
 * Track an event
 */
export function track(event: string, properties: EventProperties = {}) {
  analyticsService.track(event, properties);
}

/**
 * Track screen view
 */
export function trackScreen(
  screenName: string,
  properties: EventProperties = {},
) {
  analyticsService.screen(screenName, properties);
}

/**
 * Track cycle-specific events
 */
export function trackCycleEvent(
  action: string,
  properties: EventProperties = {},
) {
  analyticsService.trackCycleEvent(action, properties);
}

/**
 * Track user engagement
 */
export function trackEngagement(
  action: string,
  properties: EventProperties = {},
) {
  analyticsService.trackEngagement(action, properties);
}

/**
 * Track performance metrics
 */
export function trackPerformance(
  metric: string,
  duration: number,
  properties: EventProperties = {},
) {
  analyticsService.trackPerformance(metric, duration, properties);
}

/**
 * Identify user
 */
export function identify(userId: string, properties: UserProperties = {}) {
  analyticsService.identify(userId, properties);
}

/**
 * Set user properties
 */
export function setUserProperties(properties: UserProperties) {
  analyticsService.setUserProperties(properties);
}

/**
 * Request analytics consent
 */
export function requestAnalyticsConsent() {
  return analyticsService.requestConsent();
}

/**
 * Revoke analytics consent
 */
export function revokeAnalyticsConsent() {
  return analyticsService.revokeConsent();
}

/**
 * Get consent status
 */
export function getAnalyticsConsentStatus() {
  return analyticsService.getConsentStatus();
}

// Test helper aliases and utilities
export const trackEvent = track;
export const identifyUser = identify;

export function resetUser() {
  if (posthog.reset) {
    posthog.reset();
  }
}

export function _resetClient() {
  if (posthog.reset) {
    posthog.reset();
  }
}

export default analyticsService;
