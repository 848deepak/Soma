/**
 * __tests__/unit/analytics.test.ts
 *
 * Unit tests for the PostHog analytics wrapper service.
 * posthog-react-native is mocked via __mocks__/posthog-react-native.ts.
 */

jest.mock('posthog-react-native');

import PostHog from 'posthog-react-native';

// Named export exists only in the manual mock, not in the real package types.
// Retrieve it via requireMock to avoid the TS2614 assignability error.
const { mockPostHogInstance } = jest.requireMock('posthog-react-native') as {
  mockPostHogInstance: {
    capture: jest.Mock;
    identify: jest.Mock;
    reset: jest.Mock;
    shutdown: jest.Mock;
  };
};
import {
  initAnalytics,
  trackEvent,
  identifyUser,
  resetUser,
  _resetClient,
} from '@/src/services/analytics';

const MockPostHog = PostHog as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  _resetClient();
  // Restore the mock constructor return value after clearAllMocks
  MockPostHog.mockImplementation(() => mockPostHogInstance);
  mockPostHogInstance.capture.mockResolvedValue?.(undefined);
  mockPostHogInstance.identify.mockResolvedValue?.(undefined);
  mockPostHogInstance.reset.mockResolvedValue?.(undefined);
});

// ─── initAnalytics ────────────────────────────────────────────────────────────

describe('initAnalytics', () => {
  it('constructs a PostHog instance with the provided api key', () => {
    initAnalytics('phc_test_key');
    expect(MockPostHog).toHaveBeenCalledWith(
      'phc_test_key',
      expect.any(Object),
    );
  });

  it('uses memory persistence to avoid file-system side effects', () => {
    initAnalytics('phc_test_key');
    expect(MockPostHog).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ persistence: 'memory' }),
    );
  });

  it('does NOT construct a second PostHog instance if already initialised', () => {
    initAnalytics('phc_key_1');
    initAnalytics('phc_key_2');
    expect(MockPostHog).toHaveBeenCalledTimes(1);
  });

  it('constructs a new instance after _resetClient', () => {
    initAnalytics('phc_key_1');
    _resetClient();
    initAnalytics('phc_key_2');
    expect(MockPostHog).toHaveBeenCalledTimes(2);
  });
});

// ─── trackEvent ───────────────────────────────────────────────────────────────

describe('trackEvent', () => {
  it('calls client.capture with the event name', () => {
    initAnalytics('phc_test_key');
    trackEvent('Log Symptoms');
    expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
      'Log Symptoms',
      undefined,
    );
  });

  it('forwards optional properties to client.capture', () => {
    initAnalytics('phc_test_key');
    trackEvent('View Insights', { source: 'tab_bar', count: 3 });
    expect(mockPostHogInstance.capture).toHaveBeenCalledWith('View Insights', {
      source: 'tab_bar',
      count: 3,
    });
  });

  it('is a no-op (does not throw) before initAnalytics is called', () => {
    expect(() => trackEvent('Early Call')).not.toThrow();
    expect(mockPostHogInstance.capture).not.toHaveBeenCalled();
  });
});

// ─── identifyUser ─────────────────────────────────────────────────────────────

describe('identifyUser', () => {
  it('calls client.identify with the distinctId', () => {
    initAnalytics('phc_test_key');
    identifyUser('user-uuid-123');
    expect(mockPostHogInstance.identify).toHaveBeenCalledWith(
      'user-uuid-123',
      undefined,
    );
  });

  it('forwards optional trait properties', () => {
    initAnalytics('phc_test_key');
    identifyUser('user-uuid-456', { plan: 'free', onboarded: true });
    expect(mockPostHogInstance.identify).toHaveBeenCalledWith('user-uuid-456', {
      plan: 'free',
      onboarded: true,
    });
  });

  it('is a no-op (does not throw) before initAnalytics is called', () => {
    expect(() => identifyUser('early-user')).not.toThrow();
    expect(mockPostHogInstance.identify).not.toHaveBeenCalled();
  });
});

// ─── resetUser ────────────────────────────────────────────────────────────────

describe('resetUser', () => {
  it('calls client.reset to clear the PostHog session', () => {
    initAnalytics('phc_test_key');
    resetUser();
    expect(mockPostHogInstance.reset).toHaveBeenCalledTimes(1);
  });

  it('is a no-op (does not throw) before initAnalytics is called', () => {
    expect(() => resetUser()).not.toThrow();
    expect(mockPostHogInstance.reset).not.toHaveBeenCalled();
  });
});

// ─── Full lifecycle ───────────────────────────────────────────────────────────

describe('full lifecycle', () => {
  it('supports init → identify → track → reset sequence', () => {
    initAnalytics('phc_test_key');
    identifyUser('user-abc', { plan: 'free' });
    trackEvent('View Dashboard');
    trackEvent('Open Settings', { dark_mode: true });
    resetUser();

    expect(MockPostHog).toHaveBeenCalledTimes(1);
    expect(mockPostHogInstance.identify).toHaveBeenCalledWith('user-abc', { plan: 'free' });
    expect(mockPostHogInstance.capture).toHaveBeenCalledTimes(2);
    expect(mockPostHogInstance.reset).toHaveBeenCalledTimes(1);
  });
});
