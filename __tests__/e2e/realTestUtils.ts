import fs from 'node:fs';
import path from 'node:path';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const ENV_CANDIDATES = ['.env.local', '.env'];

type StringMap = Record<string, string>;

function fetchWithConnectionClose(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('Connection', 'close');
  return fetch(input, { ...init, headers });
}

function parseEnvFile(content: string): StringMap {
  const result: StringMap = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }
  return result;
}

export function loadLocalEnvFallback(): void {
  for (const filename of ENV_CANDIDATES) {
    const envPath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(envPath)) continue;

    const parsed = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

export function getRealSupabaseConfig(): { url: string; anonKey: string } {
  loadLocalEnvFallback();

  const url = process.env.SUPABASE_TEST_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_TEST_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase backend credentials for real tests. Configure your environment:\n' +
      '  1. Set SUPABASE_TEST_URL and SUPABASE_TEST_ANON_KEY (recommended for test projects), or\n' +
      '  2. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.\n' +
      'Find these values in your Supabase Dashboard → Settings → API.\n' +
      'Real tests cannot run without actual Supabase credentials.',
    );
  }

  return { url, anonKey };
}

export function createRealSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getRealSupabaseConfig();
  return createClient(url, anonKey, {
    global: {
      fetch: fetchWithConnectionClose,
    },
    auth: {
      persistSession: false,
      // Avoid background token refresh timers that can keep Jest open.
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function disposeRealSupabaseClient(client: SupabaseClient): Promise<void> {
  try {
    await client.removeAllChannels();
  } catch {
    // Best-effort cleanup.
  }

  try {
    await client.auth.signOut();
  } catch {
    // Best-effort cleanup.
  }

  try {
    const authWithStopAutoRefresh = client.auth as unknown as {
      stopAutoRefresh?: () => void;
    };
    if (typeof authWithStopAutoRefresh.stopAutoRefresh === 'function') {
      authWithStopAutoRefresh.stopAutoRefresh();
    }
  } catch {
    // Best-effort cleanup.
  }
}

export function uniqueEmail(prefix = 'soma-real'): string {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${nonce}@example.com`;
}

export async function clearUserDailyData(client: SupabaseClient, userId: string): Promise<void> {
  await client.from('daily_logs').delete().eq('user_id', userId);
  await client.from('cycles').delete().eq('user_id', userId);
}

export function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
