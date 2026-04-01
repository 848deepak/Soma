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
import { useCallback, useEffect, useRef, useState } from "react";
import { useColorScheme, View } from "react-native";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

import { useNetworkSync } from "@/hooks/useNetworkSync";
import { usePeriodAutoEnd } from "@/hooks/usePeriodAutoEnd";
import { supabase } from "@/lib/supabase";
import { AuthProvider, useAuthContext } from "@/src/context/AuthProvider";
import { HAS_LAUNCHED_KEY } from "@/src/constants/storage";
import { initSentry } from "@/src/services/errorTracking";
import { initAnalytics } from "@/src/services/analytics";
import { setupGlobalErrorHandlers } from "@/src/services/globalErrorHandlers";
import {
  initializeNotificationHandler,
  startNotificationListeners,
} from "@/src/services/notificationService/handler";
import { SomaErrorBoundary } from "@/src/components/ui/SomaErrorBoundary";
import { SomaLoadingSplash } from "@/src/components/ui/SomaLoadingSplash";
import {
  requestAndSyncPushToken,
  revokePushToken,
} from "@/src/services/notificationService/pushTokenService";

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

SplashScreen.setOptions({
  duration: 450,
  fade: true,
});

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
function AuthBootstrap({
  children,
  onBootstrapComplete,
}: {
  children: React.ReactNode;
  onBootstrapComplete?: () => void;
}) {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading, isAnonymous } = useAuthContext();
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const previousUserIdRef = useRef<string | null>(null);

  // Flush offline queue whenever connectivity is restored
  useNetworkSync();
  usePeriodAutoEnd();

  useEffect(() => {
    // Re-run bootstrap when auth identity changes (login/logout/account switch).
    setHasBootstrapped(false);
  }, [user?.id, isAnonymous]);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const previousUserId = previousUserIdRef.current;

    if (currentUserId && currentUserId !== previousUserId) {
      void requestAndSyncPushToken(currentUserId);
    }

    if (!currentUserId && previousUserId) {
      void revokePushToken(previousUserId);
    }

    previousUserIdRef.current = currentUserId;
  }, [user?.id]);

  useEffect(() => {
    let unsubscribe: () => void = () => {
      return;
    };
    void startNotificationListeners((data) => {
      if (typeof data.route === 'string' && data.route.length > 0) {
        router.push(data.route as never);
      }
    }).then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (isLoading || hasBootstrapped) return;

    let isMounted = true;

    async function bootstrap() {
      try {
        const hasLaunched = await AsyncStorage.getItem(HAS_LAUNCHED_KEY);
        const inAuth = segments[0] === "auth";
        const inOnboarding =
          segments[0] === "welcome" || segments[0] === "setup";

        if (!user) {
          // No session at all — first-time user → show auth
          if (isMounted) {
            if (!inAuth) {
              router.replace("/auth/login" as never);
            }
            setHasBootstrapped(true);
          }
          return;
        }

        if (!hasLaunched && isAnonymous) {
          // First launch with anonymous session → prompt to sign in/up
          // (Anonymous session created as fallback by the "Continue without account" path)
          if (isMounted) {
            if (!inAuth) {
              router.replace("/auth/login" as never);
            }
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
            if (!profile || !profile.is_onboarded) {
              if (!inOnboarding) {
                router.replace("/welcome" as never);
              }
            } else {
              // First valid launch with a complete profile.
              if (!hasLaunched) {
                await AsyncStorage.setItem(HAS_LAUNCHED_KEY, "true");
              }
              if (inAuth || inOnboarding || segments[0] !== "(tabs)") {
                router.replace("/(tabs)" as never);
              }
            }
            setHasBootstrapped(true);
          }
        } catch (profileError) {
          console.warn("[Auth] Profile query failed:", profileError);
          // Fail safe to onboarding to avoid bypassing setup on transient profile errors.
          if (isMounted) {
            if (!inOnboarding) {
              router.replace("/welcome" as never);
            }
            setHasBootstrapped(true);
          }
        }
      } catch (error) {
        console.warn("[Auth] Bootstrap critical error:", error);
        // Last resort: route to login when route resolution fails.
        if (isMounted) {
          router.replace("/auth/login" as never);
          setHasBootstrapped(true);
        }
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
    // We intentionally run this during bootstrap transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasBootstrapped, user?.id, isAnonymous, segments[0]]);

  useEffect(() => {
    if (hasBootstrapped) {
      onBootstrapComplete?.();
    }
  }, [hasBootstrapped, onBootstrapComplete]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appReady, setAppReady] = useState(false);
  const [authBootstrapped, setAuthBootstrapped] = useState(false);

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

  // Enhanced app readiness check - wait for fonts AND auth bootstrap.
  useEffect(() => {
    if ((fontsLoaded || fontError) && authBootstrapped) {
      setAppReady(true);
    }
  }, [fontsLoaded, fontError, authBootstrapped]);

  // Fail-safe so startup never hangs if auth/network is slow.
  useEffect(() => {
    if (appReady) return;
    const timer = setTimeout(() => {
      setAuthBootstrapped(true);
    }, 9000);
    return () => clearTimeout(timer);
  }, [appReady]);

  // Show custom splash screen while app isn't ready
  if (!appReady) {
    return (
      <SomaLoadingSplash
        subtitle="SOMA"
        timeout={9000}
        onTimeout={() => {
          setAuthBootstrapped(true);
          setAppReady(true);
        }}
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SomaErrorBoundary>
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <AuthBootstrap onBootstrapComplete={() => setAuthBootstrapped(true)}>
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
                    name="legal/privacy"
                    options={{ title: "Privacy Policy", animation: "slide_from_right" }}
                  />
                  <Stack.Screen
                    name="legal/terms"
                    options={{ title: "Terms of Use", animation: "slide_from_right" }}
                  />
                  <Stack.Screen
                    name="legal/medical-disclaimer"
                    options={{ title: "Medical Disclaimer", animation: "slide_from_right" }}
                  />
                  <Stack.Screen
                    name="legal/data-consent"
                    options={{ title: "Data Consent Center", animation: "slide_from_right" }}
                  />
                  <Stack.Screen
                    name="legal/data-practices"
                    options={{ title: "Data Practices", animation: "slide_from_right" }}
                  />
                  <Stack.Screen
                    name="legal/data-rights"
                    options={{ title: "Data Rights Requests", animation: "slide_from_right" }}
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
    </GestureHandlerRootView>
  );
}
