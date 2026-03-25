jest.mock("@sentry/react-native");

import * as Sentry from "@sentry/react-native";

import {
  captureException,
  captureMessage,
  clearUser,
  initSentry,
  setUser,
} from "@/src/services/errorTracking";

describe("errorTracking service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes safely without throwing", () => {
    expect(() => initSentry("https://abc123@sentry.io/123")).not.toThrow();
  });

  it("captures exception safely in development mode", () => {
    expect(() => captureException(new Error("something broke"))).not.toThrow();
  });

  it("captures message safely", () => {
    expect(() => captureMessage("sync queue is empty", "info")).not.toThrow();
    expect(() => captureMessage("approaching rate limit", "warning")).not.toThrow();
    expect(() => captureMessage("critical config missing", "error")).not.toThrow();
  });

  it("sets and clears user context without crashing", () => {
    expect(() => setUser("user-uuid-123")).not.toThrow();
    expect(() => clearUser()).not.toThrow();

    // In Jest (__DEV__), the wrapper avoids network calls to Sentry.
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });
});
