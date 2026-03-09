// jest.setup.ts – runs before every test file

// Silence Animated warnings in tests
jest.useFakeTimers();

// Silence console errors for known RN/Expo noise during tests
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Warning:') ||
      message.includes('act(') ||
      message.includes('ReactCurrentDispatcher'))
  ) {
    return;
  }
  originalConsoleError(...args);
};
