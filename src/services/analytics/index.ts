/**
 * src/services/analytics/index.ts
 *
 * Thin wrapper around posthog-react-native.
 *
 * Responsibilities:
 *   - One-time initialisation with the PostHog write key.
 *   - Track named product events with optional properties.
 *   - Identify users after authentication.
 *   - Reset the PostHog session on sign-out.
 *
 * The wrapper is kept thin so the underlying provider can be swapped without
 * touching call-sites and so tests can mock it at the service boundary.
 */
import PostHog from 'posthog-react-native';
import type { JsonType } from '@posthog/core';

type Properties = Record<string, JsonType>;

let client: InstanceType<typeof PostHog> | null = null;

/**
 * Initialises the PostHog client.  Safe to call multiple times – subsequent
 * calls are ignored once the client has been created.
 * @param apiKey The PostHog project write key.
 */
export function initAnalytics(apiKey: string): void {
  if (client !== null) return;
  client = new PostHog(apiKey, { persistence: 'memory' });
}

/**
 * Sends a named event to PostHog.
 * Silently no-ops if `initAnalytics` has not been called.
 * @param event      Event name following the "Verb Noun" convention.
 * @param properties Optional key-value pairs attached to the event.
 */
export function trackEvent(event: string, properties?: Properties): void {
  client?.capture(event, properties);
}

/**
 * Associates the current PostHog anonymous ID with a known user.
 * Call this after a successful sign-in.
 * @param distinctId  The user's stable UUID.
 * @param properties  Optional traits (e.g. `{ plan: 'free' }`).
 */
export function identifyUser(distinctId: string, properties?: Properties): void {
  client?.identify(distinctId, properties);
}

/** Resets the PostHog session – call on sign-out. */
export function resetUser(): void {
  client?.reset();
}

/**
 * Resets the internal client reference.
 * Exported for unit-test isolation only – do not call in production code.
 */
export function _resetClient(): void {
  client = null;
}
