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
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { setupGlobalErrorHandlers } from "@/src/services/globalErrorHandlers";
import { initializeNotificationHandler } from "@/src/services/notificationService/handler";
import { SomaErrorBoundary } from "@/src/components/ui/SomaErrorBoundary";
import { SomaLoadingSplash } from "@/src/components/ui/SomaLoadingSplash";

// ─── Observability bootstrap ────────────────────────────────────────────────
// Both services are opt-in: they only activate when the corresponding
// environment variable is defined. Safe to omit in local development.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

if (SENTRY_DSN) initSentry(SENTRY_DSN);
if (POSTHOG_KEY) initAnalytics(POSTHOG_KEY);

// Setup global error handling
setupGlobalErrorHandlers();

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
  const [hasBootstrapped, setHasBootstrapped] = useState(false);

  // Flush offline queue whenever connectivity is restored
  useNetworkSync();

  useEffect(() => {
    if (isLoading || hasBootstrapped) return;

    let isMounted = true;

    async function bootstrap() {
      try {
        // Set maximum bootstrap timeout to prevent infinite loading
        const bootstrapTimeout = setTimeout(() => {
          if (isMounted) {
            console.warn("[Auth] Bootstrap timeout reached, forcing navigation to tabs");
            router.replace("/(tabs)" as never);
            setHasBootstrapped(true);
          }
        }, 15000);

        const hasLaunched = await AsyncStorage.getItem(HAS_LAUNCHED_KEY);
        const inAuth = segments[0] === "auth";
        const inOnboarding =
          segments[0] === "welcome" || segments[0] === "setup";

        // Clear timeout if we're proceeding normally
        clearTimeout(bootstrapTimeout);

        // Already on auth or onboarding screens — don't interfere
        if (inAuth || inOnboarding) {
          if (isMounted) setHasBootstrapped(true);
          return;
        }

        if (!user) {
          // No session at all — first-time user → show auth
          if (isMounted) {
            router.replace("/auth/login" as never);
            setHasBootstrapped(true);
          }
          return;
        }

        if (!hasLaunched && isAnonymous) {
          // First launch with anonymous session → prompt to sign in/up
          // (Anonymous session created as fallback by the "Continue without account" path)
          if (isMounted) {
            router.replace("/auth/login" as never);
            setHasBootstrapped(true);
          }
          return;
        }

        // Add timeout protection for profile query
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Profile query timeout'));
          }, 5000); // Reduced timeout for faster fallback
        });

        const profilePromise = supabase
          .from("profiles")
          .select("is_onboarded")
          .eq("id", user.id)
          .maybeSingle();

        try {
          const { data: profile } = await Promise.race([
            profilePromise,
            timeoutPromise,
          ]);

          if (isMounted) {
            if (profile && !profile.is_onboarded) {
              router.replace("/welcome" as never);
            } else if (!hasLaunched) {
              // First time opening app with valid session, mark as launched and go to main app
              await AsyncStorage.setItem(HAS_LAUNCHED_KEY, "true");
              router.replace("/(tabs)" as never);
            }
            setHasBootstrapped(true);
          }
        } catch (profileError) {
          console.warn("[Auth] Profile query failed:", profileError);
          // Fallback: proceed to main app even if profile check fails
          if (isMounted) {
            try {
              if (!hasLaunched) {
                await AsyncStorage.setItem(HAS_LAUNCHED_KEY, "true");
              }
              router.replace("/(tabs)" as never);
              setHasBootstrapped(true);
            } catch (storageError) {
              console.warn("[Auth] Storage fallback failed:", storageError);
              // Ultimate fallback - go to tabs
              router.replace("/(tabs)" as never);
              setHasBootstrapped(true);
            }
          }
        }
      } catch (error) {
        console.warn("[Auth] Bootstrap critical error:", error);
        // Always ensure we don't leave the user hanging
        if (isMounted) {
          router.replace("/(tabs)" as never);
          setHasBootstrapped(true);
        }
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
    // We intentionally only run this on first auth resolution
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appReady, setAppReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    "PlayfairDisplay-Regular": PlayfairDisplay_400Regular,
    "PlayfairDisplay-SemiBold": PlayfairDisplay_600SemiBold,
  });

  // Initialize notification handler on native platforms
  useEffect(() => {
    initializeNotificationHandler();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  // Enhanced app readiness check - wait for fonts AND auth
  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Give auth a moment to resolve, then mark app as ready
      const timer = setTimeout(() => {
        setAppReady(true);
      }, 1000); // Allow 1 second for auth to initialize

      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, fontError]);

  // Show custom splash screen while app isn't ready
  if (!appReady) {
    return (
      <SomaLoadingSplash
        subtitle="Initializing your cycle companion..."
        timeout={8000}
        onTimeout={() => setAppReady(true)}
      />
    );
  }

  return (
    <SomaErrorBoundary>
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
    </SomaErrorBoundary>
  );
}
