import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import { act, render } from "@testing-library/react-native";
import { ensureProfileRow, getCurrentUser, getProfile } from "@/lib/auth";
import { bootstrapRPC, primeBootstrapCache } from "@/lib/bootstrapRPC";

const mockRouterReplace = jest.fn();
const mockUseAuthContext = jest.fn();
const mockBootstrapRPC = jest.fn();
const mockPrimeBootstrapCache = jest.fn();

jest.mock("../../global.css", () => ({}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
    push: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  }),
  useSegments: () => [],
  Stack: {
    Screen: () => null,
  },
  ErrorBoundary: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));

jest.mock("@react-native-async-storage/async-storage");

jest.mock("@/lib/auth");

jest.mock("@/src/context/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@/src/domain/logging", () => ({
  useNetworkSync: jest.fn(),
}));

jest.mock("@/src/domain/cycle", () => ({
  usePeriodAutoEnd: jest.fn(),
}));

jest.mock("@/src/context/ThemeContext", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useAppTheme: () => ({
    isHydrated: true,
    navigationTheme: {},
  }),
}));

jest.mock("@/lib/bootstrapRPC");

jest.mock("@/lib/queryClient", () => ({
  queryClient: {
    getQueryData: jest.fn().mockReturnValue(null),
  },
}));

jest.mock("@/lib/logAuthEvent");

jest.mock("@/platform/monitoring/logger", () => ({
  initializeMonitoring: jest.fn(),
  logAuthEvent: jest.fn(),
}));

jest.mock("@/src/services/analytics", () => ({
  initAnalytics: jest.fn(),
}));

jest.mock("@/src/services/errorTracking", () => ({
  initSentry: jest.fn(),
}));

jest.mock("@/src/services/globalErrorHandlers", () => ({
  setupGlobalErrorHandlers: jest.fn(),
}));

jest.mock("@/src/services/notificationService/handler", () => ({
  initializeNotificationHandler: jest.fn(),
  startNotificationListeners: jest.fn().mockResolvedValue(() => undefined),
}));

jest.mock("@/src/services/notificationService/pushTokenService", () => ({
  requestAndSyncPushToken: jest.fn(),
  revokePushToken: jest.fn(),
}));

jest.mock("@/src/components/ui/SomaErrorBoundary", () => ({
  SomaErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/src/components/ui/SomaLoadingSplash", () => ({
  SomaLoadingSplash: () => null,
}));

jest.mock("@/app/components/SomaRootErrorBoundary", () => ({
  RootErrorBoundaryWithRouterContext: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@react-navigation/native", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@tanstack/react-query", () => ({
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-native-reanimated", () => ({}));

jest.mock("@expo-google-fonts/playfair-display", () => ({
  PlayfairDisplay_400Regular: {},
  PlayfairDisplay_600SemiBold: {},
  useFonts: () => [true, null],
}));

jest.mock("expo-splash-screen", () => ({
  setOptions: jest.fn(),
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock("@/lib/supabase", () => {
  const maybeSingle = jest.fn();
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });

  return {
    supabase: {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnValue({ select }),
    },
  };
});

import { supabase } from "@/lib/supabase";
import { AuthBootstrap } from "@/app/_layout";

function mockProfileLookup(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });

  (supabase.from as jest.Mock).mockReturnValue({ select });
}

async function settleBootstrap() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("AuthBootstrap", () => {
  beforeEach(() => {
    mockRouterReplace.mockReset();
    mockUseAuthContext.mockReset();
    mockBootstrapRPC.mockReset();
    mockPrimeBootstrapCache.mockReset();

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (bootstrapRPC as jest.Mock).mockResolvedValue({
      profile: null,
      currentCycle: null,
      todayLog: null,
    });
    (primeBootstrapCache as jest.Mock).mockImplementation(() => undefined);
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    (getProfile as jest.Mock).mockResolvedValue(null);
    (ensureProfileRow as jest.Mock).mockResolvedValue(undefined);

    const defaultMaybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const defaultEq = jest.fn().mockReturnValue({ maybeSingle: defaultMaybeSingle });
    const defaultSelect = jest.fn().mockReturnValue({ eq: defaultEq });
    (supabase.from as jest.Mock).mockReset();
    (supabase.from as jest.Mock).mockReturnValue({ select: defaultSelect });
    (supabase.auth.getUser as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("routes no session users to /auth/login", async () => {
    mockUseAuthContext.mockReturnValue({
      user: null,
      isLoading: false,
      isAnonymous: false,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    render(
      <AuthBootstrap>
        <Text>child</Text>
      </AuthBootstrap>,
    );

    await settleBootstrap();

    expect(mockRouterReplace).toHaveBeenCalledWith("/auth/login");
  });

  it("routes onboarded email users to /(tabs)", async () => {
    mockUseAuthContext.mockReturnValue({
      user: { id: "user-1", email: "test@example.com" },
      isLoading: false,
      isAnonymous: false,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");
    mockProfileLookup({
      data: { id: "user-1", is_onboarded: true },
      error: null,
    });

    render(
      <AuthBootstrap>
        <Text>child</Text>
      </AuthBootstrap>,
    );

    await settleBootstrap();

    expect(mockRouterReplace).toHaveBeenCalledWith("/(tabs)");
  });

  it("routes non-onboarded email users to /welcome", async () => {
    mockUseAuthContext.mockReturnValue({
      user: { id: "user-2", email: "test@example.com" },
      isLoading: false,
      isAnonymous: false,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");
    mockProfileLookup({
      data: { id: "user-2", is_onboarded: false },
      error: null,
    });

    render(
      <AuthBootstrap>
        <Text>child</Text>
      </AuthBootstrap>,
    );

    await settleBootstrap();

    expect(mockRouterReplace).toHaveBeenCalledWith("/welcome");
  });

  it("repairs missing profiles in the background and still routes to /(tabs)", async () => {
    mockUseAuthContext.mockReturnValue({
      user: { id: "user-3", email: "test@example.com" },
      isLoading: false,
      isAnonymous: false,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");
    mockProfileLookup({
      data: null,
      error: null,
    });
    render(
      <AuthBootstrap>
        <Text>child</Text>
      </AuthBootstrap>,
    );

    await settleBootstrap();

    expect(ensureProfileRow).toHaveBeenCalledWith("user-3");
    expect(mockRouterReplace).toHaveBeenCalledWith("/(tabs)");
  });

  it("routes anonymous users with a launched app to /welcome", async () => {
    mockUseAuthContext.mockReturnValue({
      user: { id: "anon-user", email: null },
      isLoading: false,
      isAnonymous: true,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");
    mockProfileLookup({
      data: null,
      error: null,
    });

    render(
      <AuthBootstrap>
        <Text>child</Text>
      </AuthBootstrap>,
    );

    await settleBootstrap();

    expect(mockRouterReplace).toHaveBeenCalledWith("/welcome");
  });
});