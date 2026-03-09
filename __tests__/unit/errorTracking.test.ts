/**
 * __tests__/unit/errorTracking.test.ts
 *
 * Unit tests for the Sentry error-tracking wrapper service.
 * @sentry/react-native is mocked via __mocks__/@sentry/react-native.ts.
 */

jest.mock('@sentry/react-native');

import * as Sentry from '@sentry/react-native';
import {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  _resetInitFlag,
} from '@/src/services/errorTracking';

const mockInit = Sentry.init as jest.Mock;
const mockCaptureException = Sentry.captureException as jest.Mock;
const mockCaptureMessage = Sentry.captureMessage as jest.Mock;
const mockSetUser = Sentry.setUser as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  _resetInitFlag();
});

// ─── initSentry ───────────────────────────────────────────────────────────────

describe('initSentry', () => {
  it('calls Sentry.init with the provided DSN', () => {
    initSentry('https://abc123@sentry.io/123');
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://abc123@sentry.io/123' }),
    );
  });

  it('sets tracesSampleRate to 0.2', () => {
    initSentry('https://test@sentry.io/1');
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ tracesSampleRate: 0.2 }),
    );
  });

  it('disables sendDefaultPii', () => {
    initSentry('https://test@sentry.io/1');
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ sendDefaultPii: false }),
    );
  });

  it('does NOT call Sentry.init a second time if already initialised', () => {
    initSentry('https://first@sentry.io/1');
    initSentry('https://second@sentry.io/2');
    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it('calls Sentry.init again after _resetInitFlag', () => {
    initSentry('https://test@sentry.io/1');
    _resetInitFlag();
    initSentry('https://test@sentry.io/1');
    expect(mockInit).toHaveBeenCalledTimes(2);
  });
});

// ─── captureException ─────────────────────────────────────────────────────────

describe('captureException', () => {
  it('delegates to Sentry.captureException with an Error object', () => {
    const error = new Error('something broke');
    captureException(error);
    expect(mockCaptureException).toHaveBeenCalledWith(error);
  });

  it('delegates to Sentry.captureException with a string value', () => {
    captureException('string error');
    expect(mockCaptureException).toHaveBeenCalledWith('string error');
  });

  it('delegates to Sentry.captureException with an unknown value', () => {
    captureException({ code: 42 });
    expect(mockCaptureException).toHaveBeenCalledWith({ code: 42 });
  });
});

// ─── captureMessage ───────────────────────────────────────────────────────────

describe('captureMessage', () => {
  it('delegates to Sentry.captureMessage with the given message', () => {
    captureMessage('sync queue is empty');
    expect(mockCaptureMessage).toHaveBeenCalledWith('sync queue is empty', 'info');
  });

  it('defaults the level to "info" when not provided', () => {
    captureMessage('default level test');
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'default level test',
      'info',
    );
  });

  it('forwards "warning" level to Sentry.captureMessage', () => {
    captureMessage('approaching rate limit', 'warning');
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'approaching rate limit',
      'warning',
    );
  });

  it('forwards "error" level to Sentry.captureMessage', () => {
    captureMessage('critical config missing', 'error');
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'critical config missing',
      'error',
    );
  });
});

// ─── setUser ──────────────────────────────────────────────────────────────────

describe('setUser', () => {
  it('calls Sentry.setUser with the correct id for an authenticated user', () => {
    setUser('user-uuid-123', false);
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-uuid-123' }),
    );
  });

  it('sets username to "anonymous" for an anonymous session', () => {
    setUser('anon-uuid-456', true);
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'anon-uuid-456', username: 'anonymous' }),
    );
  });

  it('does not include username for authenticated users', () => {
    setUser('user-uuid-789', false);
    const call = mockSetUser.mock.calls[0][0] as Record<string, unknown>;
    expect(call.username).toBeUndefined();
  });
});

// ─── clearUser ────────────────────────────────────────────────────────────────

describe('clearUser', () => {
  it('calls Sentry.setUser(null) to clear the user context', () => {
    clearUser();
    expect(mockSetUser).toHaveBeenCalledWith(null);
  });

  it('calls Sentry.setUser exactly once', () => {
    clearUser();
    expect(mockSetUser).toHaveBeenCalledTimes(1);
  });
});
