import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  clearUserDailyData,
  createRealSupabaseClient,
  disposeRealSupabaseClient,
  getRealSupabaseConfig,
  loadLocalEnvFallback,
} from './realTestUtils';

function fetchWithConnectionClose(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('Connection', 'close');
  return fetch(input, { ...init, headers });
}

loadLocalEnvFallback();

const hasRealEnv = Boolean(
  process.env.SUPABASE_TEST_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_TEST_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

const describeReal = hasRealEnv ? describe : describe.skip;

describeReal('Real Supabase Auth Flow', () => {
  const clientsToDispose: SupabaseClient[] = [];
  const testEmail = process.env.SUPABASE_TEST_USER_EMAIL;
  const testPassword = process.env.SUPABASE_TEST_PASSWORD;

  afterEach(async () => {
    while (clientsToDispose.length > 0) {
      const client = clientsToDispose.pop();
      if (client) {
        await disposeRealSupabaseClient(client);
      }
    }
  });

  beforeAll(() => {
    if (!testEmail || !testPassword) {
      throw new Error(
        'Real auth test requires pre-created test user credentials. Set SUPABASE_TEST_USER_EMAIL and SUPABASE_TEST_PASSWORD to a pre-provisioned test account.',
      );
    }
  });

  it('signs up, logs in, verifies profile row, refreshes token, and signs out', async () => {
    const supabase = createRealSupabaseClient();
    clientsToDispose.push(supabase);
    const email = testEmail!;
    const password = testPassword!;

    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (signIn.error) {
      if (signIn.error.message.toLowerCase().includes('email not confirmed')) {
        throw new Error(
          'Real auth test requires email confirmation disabled in the dedicated test Supabase project.',
        );
      }
      throw signIn.error;
    }

    const userId = signIn.data.user?.id;
    expect(userId).toBeTruthy();
    expect(signIn.data.session?.access_token).toBeTruthy();

    const profileResult = await supabase
      .from('profiles')
      .select('id, created_at')
      .eq('id', userId)
      .maybeSingle();

    expect(profileResult.error).toBeNull();
    expect(profileResult.data?.id).toBe(userId);

    const refreshResult = await supabase.auth.refreshSession();
    expect(refreshResult.error).toBeNull();
    expect(refreshResult.data.session?.access_token).toBeTruthy();

    const { url, anonKey } = getRealSupabaseConfig();
    const persistedSession = refreshResult.data.session;
    expect(persistedSession).toBeTruthy();

    const memoryStorage = new Map<string, string>();
    const storage = {
      getItem: async (key: string) => memoryStorage.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        memoryStorage.set(key, value);
      },
      removeItem: async (key: string) => {
        memoryStorage.delete(key);
      },
    };

    const persistentClientA = createClient(url, anonKey, {
      global: {
        fetch: fetchWithConnectionClose,
      },
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage,
      },
    });
    clientsToDispose.push(persistentClientA);

    const persistentClientB = createClient(url, anonKey, {
      global: {
        fetch: fetchWithConnectionClose,
      },
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage,
      },
    });
    clientsToDispose.push(persistentClientB);

    const setSessionResult = await persistentClientA.auth.setSession({
      access_token: persistedSession!.access_token,
      refresh_token: persistedSession!.refresh_token,
    });
    expect(setSessionResult.error).toBeNull();

    const sessionAfterRecreate = await persistentClientB.auth.getSession();
    expect(sessionAfterRecreate.error).toBeNull();
    expect(sessionAfterRecreate.data.session?.user.id).toBe(userId);

    await clearUserDailyData(supabase, userId!);

    const signOut = await supabase.auth.signOut();
    expect(signOut.error).toBeNull();

    const current = await supabase.auth.getUser();
    expect(current.data.user).toBeNull();
  });
});
