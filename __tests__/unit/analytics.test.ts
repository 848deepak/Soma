jest.mock("posthog-react-native", () => ({
  __esModule: true,
  default: {
    initPostHog: jest.fn().mockResolvedValue(undefined),
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    group: jest.fn(),
    getFeatureFlag: jest.fn(),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import PostHog from "posthog-react-native";

type PostHogMock = {
  initPostHog: jest.Mock;
  reset: jest.Mock;
};

const posthog = PostHog as unknown as PostHogMock;

import {
  _resetClient,
  identifyUser,
  initAnalytics,
  resetUser,
  trackEvent,
} from "@/src/services/analytics";

describe("analytics service", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await (AsyncStorage.clear as jest.Mock)();
    _resetClient();
  });

  it("does not initialize PostHog without consent", async () => {
    await initAnalytics("phc_test_key");
    expect(posthog.initPostHog).not.toHaveBeenCalled();
  });

  it("initialization call is safe when consent is enabled", async () => {
    await (AsyncStorage.setItem as jest.Mock)("analytics_consent", "true");
    expect(() => initAnalytics("phc_test_key")).not.toThrow();
  });

  it("trackEvent remains safe before and after init", async () => {
    trackEvent("Log Symptoms", { source: "home" });
    expect(() => trackEvent("Log Symptoms", { source: "home" })).not.toThrow();

    await (AsyncStorage.setItem as jest.Mock)("analytics_consent", "true");
    await initAnalytics("phc_test_key");

    expect(() => trackEvent("Log Symptoms", { source: "home" })).not.toThrow();
  });

  it("identify and reset are safe calls", () => {
    expect(() => identifyUser("user-123", { plan: "free" })).not.toThrow();
    expect(() => resetUser()).not.toThrow();
    expect(posthog.reset).toHaveBeenCalled();
  });
});
