import {
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    useFonts,
} from "@expo-google-fonts/playfair-display";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

import { useNetworkSync } from "@/src/domain/logging";
import { usePeriodAutoEnd } from "@/src/domain/cycle";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { bootstrapRPC, primeBootstrapCache } from "@/lib/bootstrapRPC";
import { initializeMonitoring, logAuthEvent as logAuthEventMonitoring } from "@/platform/monitoring/logger";
import { SomaErrorBoundary } from "@/src/components/ui/SomaErrorBoundary";
import { SomaLoadingSplash } from "@/src/components/ui/SomaLoadingSplash";
import { HAS_LAUNCHED_KEY } from "@/src/constants/storage";
import { AuthProvider, useAuthContext } from "@/src/context/AuthProvider";
import { ThemeProvider, useAppTheme } from "@/src/context/ThemeContext";
import { initAnalytics } from "@/src/services/analytics";
import { initSentry } from "@/src/services/errorTracking";
import { setupGlobalErrorHandlers } from "@/src/services/globalErrorHandlers";
import {
    initializeNotificationHandler,
    startNotificationListeners,
} from "@/src/services/notificationService/handler";
import {
    requestAndSyncPushToken,
    revokePushToken,
} from "@/src/services/notificationService/pushTokenService";
import { logAuthEvent } from "@/lib/logAuthEvent";
import { ensureProfileRow } from "@/lib/auth";
import { RootErrorBoundaryWithRouterContext } from "@/app/components/SomaRootErrorBoundary";

// ─── Observability bootstrap ────────────────────────────────────────────────
// Both services are opt-in: they only activate when the corresponding
// environment variable is defined. Safe to omit in local development.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

if (SENTRY_DSN) initSentry(SENTRY_DSN);
if (POSTHOG_KEY) initAnalytics(POSTHOG_KEY);

// Setup global error handling
setupGlobalErrorHandlers();

// Initialize structured monitoring and logging
initializeMonitoring();

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
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

// QueryClient is now initialized in lib/queryClient.ts with persistence

const PROFILE_BOOTSTRAP_TIMEOUT_MS = 10000;
const PROFILE_BOOTSTRAP_MAX_RETRIES = 2;

type BootstrapProfileResult =
  | {
      status: "found";
      profile: {
        id: string;
        is_onboarded: boolean;
      };
    }
  | { status: "missing" }
  | {
      status: "error";
      error: Error;
    };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientProfileLookupError(error: Error): boolean {
  const normalized = error.message.toLowerCase();
  return (
    normalized.includes("timeout") ||
    normalized.includes("network") ||
    normalized.includes("fetch") ||
    normalized.includes("failed to fetch")
  );
}

async function fetchProfileForBootstrap(userId: string): Promise<BootstrapProfileResult> {
  for (let attempt = 1; attempt <= PROFILE_BOOTSTRAP_MAX_RETRIES; attempt += 1) {
    const startedAt = Date.now();
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Profile query timeout"));
        }, PROFILE_BOOTSTRAP_TIMEOUT_MS);
      });

      const queryPromise = supabase
        .from("profiles")
        .select("id,is_onboarded")
        .eq("id", userId)
        .maybeSingle();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      const durationMs = Date.now() - startedAt;

      if (error) {
        throw new Error(error.message || "Profile query failed");
      }

      if (!data) {
        console.log("[Auth] Profile lookup result:", {
          userId,
          durationMs,
          status: "missing",
        });
        return { status: "missing" };
      }

      if (data.id !== userId) {
        const mismatchError = new Error(
          `Profile uid mismatch: auth uid=${userId}, profile uid=${data.id}`,
        );
        return {
          status: "error",
          error: mismatchError,
        };
      }

      console.log("[Auth] Profile lookup result:", {
        userId,
        durationMs,
        status: "found",
        isOnboarded: Boolean(data.is_onboarded),
      });

      return {
        status: "found",
        profile: {
          id: data.id,
          is_onboarded: Boolean(data.is_onboarded),
        },
      };
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error("Unknown profile lookup error");

      console.warn("[Auth] Profile lookup attempt failed:", {
        userId,
        attempt,
        maxRetries: PROFILE_BOOTSTRAP_MAX_RETRIES,
        message: normalizedError.message,
      });

      if (
        attempt < PROFILE_BOOTSTRAP_MAX_RETRIES &&
        isTransientProfileLookupError(normalizedError)
      ) {
        await delay(250 * attempt);
        continue;
      }

      return {
        status: "error",
        error: normalizedError,
      };
    }
  }

  return {
    status: "error",
    error: new Error("Profile lookup exhausted all retries"),
  };
}

/**
 * Bootstraps auth and implements the correct user flow:
 *
 *  New user:          Auth screen → Welcome → Setup → Tabs
 *  Returning email:   (already has session)  onboarding check → Tabs
 *  Returning anon:    Tabs directly (skip login prompt)
 */
export function AuthBootstrap({
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
  const currentSegmentRef = useRef<string | undefined>(segments[0]);
  const bootstrapRunIdRef = useRef(0);
  const navigationLockRef = useRef(false);

  // Flush offline queue whenever connectivity is restored
  useNetworkSync();
  usePeriodAutoEnd();

  useEffect(() => {
    currentSegmentRef.current = segments[0];
  }, [segments]);

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

    // Whitelist of allowed deep link routes to prevent unauthorized navigation
    const ALLOWED_DEEP_LINK_ROUTES = [
      '/(tabs)',
      '/(tabs)/home',
      '/log',
      '/quick-checkin',
      '/partner',
      '/insights',
      '/calendar',
    ];

    void startNotificationListeners((data) => {
      if (typeof data.route === "string" && data.route.length > 0) {
        // Validate route against whitelist before navigation
        if (!ALLOWED_DEEP_LINK_ROUTES.includes(data.route)) {
          console.warn('[DeepLink] Blocked invalid deep link route:', {
            route: data.route,
            timestamp: new Date().toISOString(),
          });
          return;
        }
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
    const bootstrapRunId = ++bootstrapRunIdRef.current;

    /**
     * Safely navigate to a route while holding a lock to prevent double navigation.
     * Navigation is guarded: only the first router.replace() call succeeds.
     */
    const safeNavigate = (destination: string, reason: string) => {
      if (navigationLockRef.current) {
        if (__DEV__) {
          console.warn('[Bootstrap] Navigation blocked — lock active', {
            destination,
            reason,
            currentLock: navigationLockRef.current,
          });
        }
        return;
      }
      navigationLockRef.current = true;
      if (__DEV__) {
        console.log('[Bootstrap] Navigation locked and proceeding to:', {
          destination,
          reason,
        });
      }
      router.replace(destination as never);
    };

    async function bootstrap() {
      try {
        const hasLaunched = await AsyncStorage.getItem(HAS_LAUNCHED_KEY);
        const currentSegment = currentSegmentRef.current;
        const inAuth = currentSegment === "auth";
        const inOnboarding = currentSegment === "welcome" || currentSegment === "setup";

        if (!isMounted || bootstrapRunId !== bootstrapRunIdRef.current) {
          return;
        }

        console.log("[Auth] Bootstrap start:", {
          userId: user?.id ?? null,
          email: user?.email ?? null,
          isAnonymous,
          hasLaunched: Boolean(hasLaunched),
          currentSegment: currentSegment ?? null,
        });

        // Log session restore event
        logAuthEvent({
          type: "session_restore",
          success: !!user,
          userId: user?.id,
        });

        if (!user) {
          // No session at all — first-time user → show auth
          if (isMounted) {
            if (!inAuth) {
              safeNavigate("/auth/login", "no_session");
            }
            setHasBootstrapped(true);
          }
          return;
        }

        // ─── Prime bootstrap cache ────────────────────────────────────
        // Fetch profile + currentCycle + todayLog in one batch (or in parallel)
        // This reduces startup queries from 5+ sequential to 1 batch call
        try {
          const bootstrapData = await bootstrapRPC(user.id);
          if (isMounted) {
            primeBootstrapCache(queryClient, bootstrapData, user.id);
          }
        } catch (bootstrapError) {
          console.warn(
            "[Auth] Bootstrap cache priming failed (non-blocking):",
            bootstrapError,
          );
          // Continue bootstrap even if RPC fails; individual hooks will fetch
        }
        // ────────────────────────────────────────────────────────────────

        if (!hasLaunched && isAnonymous) {
          // First launch with anonymous session → prompt to sign in/up
          // (Anonymous session created as fallback by the "Continue without account" path)
          if (isMounted) {
            if (!inAuth) {
              safeNavigate("/auth/login", "anonymous_first_launch");
            }
            setHasBootstrapped(true);
          }
          return;
        }

        const profileResult = await fetchProfileForBootstrap(user.id);
        if (!isMounted || bootstrapRunId !== bootstrapRunIdRef.current) {
          return;
        }

        if (profileResult.status === "found") {
          if (!profileResult.profile.is_onboarded) {
            console.log("[Auth] Routing decision:", {
              userId: user.id,
              destination: "/welcome",
              reason: "profile_found_not_onboarded",
            });
            logAuthEvent({
              type: "bootstrap_routing",
              userId: user.id,
              reason: "needs_onboarding",
              route: "/welcome",
            });
            if (!inOnboarding) {
              safeNavigate("/welcome", "profile_found_not_onboarded");
            }
            setHasBootstrapped(true);
            return;
          }

          if (!hasLaunched) {
            await AsyncStorage.setItem(HAS_LAUNCHED_KEY, "true");
          }

          if (inAuth || inOnboarding || currentSegmentRef.current !== "(tabs)") {
            console.log("[Auth] Routing decision:", {
              userId: user.id,
              destination: "/(tabs)",
              reason: "profile_found_onboarded",
            });
            logAuthEvent({
              type: "bootstrap_routing",
              userId: user.id,
              reason: "onboarded",
              route: "/(tabs)",
            });
            safeNavigate("/(tabs)", "profile_found_onboarded");
          }
          setHasBootstrapped(true);
          return;
        }

        if (profileResult.status === "missing") {
          // User has valid session with email but profile lookup returned null.
          // Do NOT force re-onboarding. Route to tabs and trigger background repair.
          if (user.email) {
            console.log("[Auth] Profile missing but user has email. Routing to tabs and triggering repair:", {
              userId: user.id,
              email: user.email,
            });

            // Background repair with retries
            const performRepairWithRetry = async () => {
              for (let i = 0; i < 3; i++) {
                try {
                  return await ensureProfileRow(user.id);
                } catch (e) {
                  if (i === 2) throw e;
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                }
              }
            };

            performRepairWithRetry().catch((repairError) => {
              console.error("[Auth] Profile repair failed after retries:", repairError);
              logAuthEvent({
                type: "profile_repair_failure",
                userId: user.id,
                error: repairError instanceof Error ? repairError.message : String(repairError),
              });
              // Route to welcome on profile repair failure, respecting navigation lock
              if (isMounted && !inOnboarding && !navigationLockRef.current) {
                safeNavigate("/welcome", "profile_repair_failure");
              }
            });

            logAuthEvent({
              type: "bootstrap_routing",
              userId: user.id,
              reason: "profile_repair",
              route: "/(tabs)",
            });

            if (!inAuth && !inOnboarding && currentSegmentRef.current === "(tabs)") {
              setHasBootstrapped(true);
              return;
            }
            safeNavigate("/(tabs)", "profile_repair");
            setHasBootstrapped(true);
            return;
          }

          // No email - user is anonymous. Route to onboarding.
          console.log("[Auth] Routing decision:", {
            userId: user.id,
            destination: "/welcome",
            reason: "profile_missing_anonymous",
          });
          logAuthEvent({
            type: "bootstrap_routing",
            userId: user.id,
            reason: "needs_onboarding",
            route: "/welcome",
          });
          if (!inOnboarding) {
            safeNavigate("/welcome", "profile_missing_anonymous");
          }
          setHasBootstrapped(true);
          return;
        }

        const cachedProfile = queryClient.getQueryData<
          { id?: string; is_onboarded?: boolean } | null
        >(["profile"]);

        if (cachedProfile?.id === user.id && typeof cachedProfile.is_onboarded === "boolean") {
          console.log("[Auth] Using cached profile fallback:", {
            userId: user.id,
            isOnboarded: cachedProfile.is_onboarded,
          });

          if (cachedProfile.is_onboarded) {
            if (inAuth || inOnboarding || currentSegmentRef.current !== "(tabs)") {
              safeNavigate("/(tabs)", "cached_profile_onboarded");
            }
          } else if (!inOnboarding) {
            safeNavigate("/welcome", "cached_profile_not_onboarded");
          }

          setHasBootstrapped(true);
          return;
        }

        console.warn("[Auth] Profile lookup error fallback:", {
          userId: user.id,
          message: profileResult.error.message,
        });

        // Avoid misclassifying existing users as new users on transient DB failures.
        if (inAuth || inOnboarding || currentSegmentRef.current !== "(tabs)") {
          safeNavigate("/(tabs)", "profile_lookup_error_fallback");
        }
        setHasBootstrapped(true);
      } catch (error) {
        console.warn("[Auth] Bootstrap critical error:", error);
        // Last resort: route to login when route resolution fails.
        if (isMounted) {
          safeNavigate("/auth/login", "bootstrap_critical_error");
          setHasBootstrapped(true);
        }
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
      navigationLockRef.current = false;
    };
    // We intentionally run this during bootstrap transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasBootstrapped, user?.id, isAnonymous, router]);

  useEffect(() => {
    if (hasBootstrapped) {
      onBootstrapComplete?.();
    }
  }, [hasBootstrapped, onBootstrapComplete]);

  return <>{children}</>;
}

function RootAppShell() {
  const { isHydrated: isThemeHydrated, navigationTheme } = useAppTheme();
  const [appReady, setAppReady] = useState(false);
  const [authBootstrapped, setAuthBootstrapped] = useState(false);
  const [showSlowNetworkHint, setShowSlowNetworkHint] = useState(false);

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
    if ((fontsLoaded || fontError) && authBootstrapped && isThemeHydrated) {
      setShowSlowNetworkHint(false);
      setAppReady(true);
    }
  }, [fontsLoaded, fontError, authBootstrapped, isThemeHydrated]);

  // Show a subtle connectivity hint if initial bootstrap takes >5s.
  useEffect(() => {
    if (appReady || authBootstrapped) {
      setShowSlowNetworkHint(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowSlowNetworkHint(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [appReady, authBootstrapped]);

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
        hintText={
          showSlowNetworkHint
            ? "Taking longer than usual. Check your connection."
            : undefined
        }
        timeout={9000}
        onTimeout={() => {
          setAuthBootstrapped(true);
          setShowSlowNetworkHint(false);
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
                <AuthBootstrap
                    onBootstrapComplete={() => {
                      setShowSlowNetworkHint(false);
                      setAuthBootstrapped(true);
                    }}
                >
                  <NavigationThemeProvider value={navigationTheme}>
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
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="legal/privacy"
                        options={{
                          title: "Privacy Policy",
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="legal/terms"
                        options={{
                          title: "Terms of Use",
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="legal/medical-disclaimer"
                        options={{
                          title: "Medical Disclaimer",
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="legal/data-consent"
                        options={{
                          title: "Data Consent Center",
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="legal/data-practices"
                        options={{
                          title: "Data Practices",
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="legal/data-rights"
                        options={{
                          title: "Data Rights Requests",
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="welcome"
                        options={{ headerShown: false, animation: "fade" }}
                      />
                      <Stack.Screen
                        name="setup"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                        }}
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
                      <Stack.Screen
                        name="settings/edit-profile"
                        options={{ title: "Edit Profile", animation: "slide_from_right" }}
                      />
                      <Stack.Screen
                        name="settings/cycle-length"
                        options={{ title: "Cycle Length", animation: "slide_from_right" }}
                      />
                      <Stack.Screen
                        name="settings/period-duration"
                        options={{ title: "Period Duration", animation: "slide_from_right" }}
                      />
                    </Stack>
                  </NavigationThemeProvider>
                </AuthBootstrap>
              </AuthProvider>
            </QueryClientProvider>
          </SafeAreaProvider>
        </View>
      </SomaErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const router = useRouter();
  return (
    <RootErrorBoundaryWithRouterContext router={router}>
      <ThemeProvider>
        <RootAppShell />
      </ThemeProvider>
    </RootErrorBoundaryWithRouterContext>
  );
}
