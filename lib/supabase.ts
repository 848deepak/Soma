/**
 * lib/supabase.ts
 * Singleton Supabase client typed against the Phase 1 schema.
 *
 * react-native-url-polyfill must be imported before @supabase/supabase-js.
 * The import lives here (not in app/_layout.tsx) so any module that imports
 * this file always gets the polyfill installed first.
 */
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { logAuthEvent } from "@/lib/logAuthEvent";

const runtimeExtra =
  (Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? {}) as Record<
    string,
    string | undefined
  >;

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? runtimeExtra.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  runtimeExtra.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const API_TIMEOUT_MS = 15000;

const webStorage = {
  getItem: async (key: string) => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(key);
  },
};

/**
 * Resolves the appropriate auth storage backend based on platform.
 * Native (iOS/Android): uses AsyncStorage for session persistence.
 * Web: uses default Supabase web storage (sessionStorage).
 */
function resolveAuthStorage() {
  if (Platform.OS === "web") {
    // Web: let Supabase use its default web storage (sessionStorage)
    logAuthEvent({ type: "storage_selected", backend: "web" });
    return undefined;
  }
  // Native (iOS / Android): always use AsyncStorage
  const platformBackend = Platform.OS === "ios" ? "ios" : "android";
  logAuthEvent({ type: "storage_selected", backend: platformBackend });
  return {
    getItem: (key: string) => AsyncStorage.getItem(key),
    setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
    removeItem: (key: string) => AsyncStorage.removeItem(key),
  };
}

const authStorage = resolveAuthStorage();

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  // Combine the timeout signal with any signal the caller already provided
  // so that both component unmounts and the 15 s ceiling are respected.
  const callerSignal = init?.signal ?? null;
  const signal =
    callerSignal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([controller.signal, callerSignal])
      : controller.signal;

  return fetch(input, { ...init, signal }).finally(() => {
    clearTimeout(timeout);
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables.\n" +
      "Copy .env.example → .env.local and fill in EXPO_PUBLIC_SUPABASE_URL " +
      "and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    // AsyncStorage keeps the session across app restarts on mobile
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    // URL-based OAuth callbacks are not used in this React Native app
    // Only detect URL sessions on web platform
    detectSessionInUrl: Platform.OS === "web",
  },
});
