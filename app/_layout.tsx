import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  useFonts,
} from "@expo-google-fonts/playfair-display";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect } from "react";
import { useColorScheme, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

import { useNetworkSync } from "@/hooks/useNetworkSync";
import { supabase } from "@/lib/supabase";
import { AuthProvider, useAuthContext } from "@/src/context/AuthProvider";
import { HAS_LAUNCHED_KEY } from "@/src/constants/storage";
import { initSentry } from "@/src/services/errorTracking";
import { initAnalytics } from "@/src/services/analytics";

// ─── Observability bootstrap ────────────────────────────────────────────────
// Both services are opt-in: they only activate when the corresponding
// environment variable is defined. Safe to omit in local development.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

if (SENTRY_DSN) initSentry(SENTRY_DSN);
if (POSTHOG_KEY) initAnalytics(POSTHOG_KEY);

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Start from index, which redirects to /auth/login.
  // This ensures auth screens are shown first, preventing the
  // tab screen from flashing before auth redirect fires.
  initialRouteName: "index",
};

// Keep the splash screen visible while fonts are loading
SplashScreen.preventAutoHideAsync();

// ─── Foreground notification handler ────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Singleton QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  },
});

/**
 * Bootstraps auth and implements the correct user flow:
 *
 *  New user:          Auth screen → Welcome → Setup → Tabs
 *  Returning email:   (already has session)  onboarding check → Tabs
 *  Returning anon:    Tabs directly (skip login prompt)
 */
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading, isAnonymous } = useAuthContext();

  // Flush offline queue whenever connectivity is restored
  useNetworkSync();

  useEffect(() => {
    if (isLoading) return;

    async function bootstrap() {
      try {
        const hasLaunched = await AsyncStorage.getItem(HAS_LAUNCHED_KEY);
        const inAuth = segments[0] === "auth";
        const inOnboarding =
          segments[0] === "welcome" || segments[0] === "setup";

        // Already on auth or onboarding screens — don't interfere
        if (inAuth || inOnboarding) return;

        if (!user) {
          // No session at all — first-time user → show auth
          router.replace("/auth/login" as never);
          return;
        }

        if (!hasLaunched && isAnonymous) {
          // First launch with anonymous session → prompt to sign in/up
          // (Anonymous session created as fallback by the "Continue without account" path)
          router.replace("/auth/login" as never);
          return;
        }

        // User has a session — check onboarding status
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_onboarded")
          .eq("id", user.id)
          .maybeSingle();

        if (profile && !profile.is_onboarded) {
          router.replace("/welcome" as never);
        }
      } catch (error) {
        console.warn("[Auth] Bootstrap error:", error);
      }
    }

    bootstrap();
    // We intentionally only run this on first auth resolution
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded, fontError] = useFonts({
    "PlayfairDisplay-Regular": PlayfairDisplay_400Regular,
    "PlayfairDisplay-SemiBold": PlayfairDisplay_600SemiBold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Wait for fonts before rendering
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthBootstrap>
              <ThemeProvider
                value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
              >
                <Stack>
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="auth/login"
                    options={{ headerShown: false, animation: "fade" }}
                  />
                  <Stack.Screen
                    name="auth/signup"
                    options={{ headerShown: false, animation: "slide_from_right" }}
                  />
                  <Stack.Screen
                    name="welcome"
                    options={{ headerShown: false, animation: "fade" }}
                  />
                  <Stack.Screen
                    name="setup"
                    options={{ headerShown: false, animation: "slide_from_right" }}
                  />
                  <Stack.Screen
                    name="log"
                    options={{ title: "Daily Log", presentation: "modal" }}
                  />
                  <Stack.Screen
                    name="quick-checkin"
                    options={{
                      title: "Quick Check-in",
                      presentation: "transparentModal",
                    }}
                  />
                  <Stack.Screen
                    name="partner"
                    options={{ title: "Partner Sync", headerShown: false }}
                  />
                  <Stack.Screen
                    name="profile"
                    options={{ title: "Profile", headerShown: false }}
                  />
                </Stack>
              </ThemeProvider>
            </AuthBootstrap>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </View>
  );
}
