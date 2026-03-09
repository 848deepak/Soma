/**
 * __mocks__/@sentry/react-native.ts
 *
 * Manual Jest mock for @sentry/react-native.
 * Placed at __mocks__/@sentry/react-native.ts so Jest resolves it automatically
 * when tests call jest.mock('@sentry/react-native').
 */

export const init = jest.fn();
export const captureException = jest.fn();
export const captureMessage = jest.fn();
export const setUser = jest.fn();
export const addBreadcrumb = jest.fn();
export const withScope = jest.fn((callback: (scope: { setTag: jest.Mock; setExtra: jest.Mock; setLevel: jest.Mock }) => void) => {
  callback({ setTag: jest.fn(), setExtra: jest.fn(), setLevel: jest.fn() });
});

// SeverityLevel values used in captureMessage
export const SeverityLevel = {
  Fatal: 'fatal',
  Error: 'error',
  Warning: 'warning',
  Log: 'log',
  Info: 'info',
  Debug: 'debug',
} as const;
