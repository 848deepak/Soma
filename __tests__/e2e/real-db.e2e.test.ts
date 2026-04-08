import {
  clearUserDailyData,
  createRealSupabaseClient,
  disposeRealSupabaseClient,
  loadLocalEnvFallback,
  todayIso,
} from './realTestUtils';

loadLocalEnvFallback();

const hasRealEnv = Boolean(
  process.env.SUPABASE_TEST_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_TEST_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

const describeReal = hasRealEnv ? describe : describe.skip;

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out after ${ms}ms during ${label}`));
    }, ms);

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

describeReal('Real Supabase DB Flow', () => {
  jest.setTimeout(120000);
  const clientsToDispose: ReturnType<typeof createRealSupabaseClient>[] = [];

  const testEmail = process.env.SUPABASE_TEST_USER_EMAIL;
  const testPassword = process.env.SUPABASE_TEST_PASSWORD;

  beforeAll(() => {
    jest.useRealTimers();

    if (!testEmail || !testPassword) {
      throw new Error(
        'Real DB test requires pre-created test user credentials. Set SUPABASE_TEST_USER_EMAIL and SUPABASE_TEST_PASSWORD to a pre-provisioned test account.',
      );
    }
  });

  afterEach(async () => {
    while (clientsToDispose.length > 0) {
      const client = clientsToDispose.pop();
      if (client) {
        await disposeRealSupabaseClient(client);
      }
    }
  });

  afterAll(() => {
    jest.useFakeTimers();
  });

  async function signInForCrud() {
    const supabase = createRealSupabaseClient();
    clientsToDispose.push(supabase);
    const emailSignIn = await withTimeout(
      supabase.auth.signInWithPassword({
        email: testEmail!,
        password: testPassword!,
      }),
      15000,
      'email/password sign-in',
    );
    if (emailSignIn.error) {
      throw new Error(
        `Real DB test failed to sign in with test account: ${emailSignIn.error.message}. Ensure credentials are correct and test user exists.`,
      );
    }

    return {
      supabase,
      userId: emailSignIn.data.user?.id,
    };
  }

  it('inserts, fetches, updates, and deletes real daily log rows', async () => {
    const signIn = await signInForCrud();

    const { supabase, userId } = signIn;
    expect(userId).toBeTruthy();

    const date = todayIso();

    // Ensure idempotent CRUD test runs even if a previous run left today's row behind.
    const preDelete = await supabase
      .from('daily_logs')
      .delete()
      .eq('user_id', userId)
      .eq('date', date);
    expect(preDelete.error).toBeNull();

    const insertResult = await supabase.from('daily_logs').insert({
      user_id: userId,
      date,
      flow_level: 1,
      mood: 'Calm',
      energy_level: 'Medium',
      symptoms: ['Cramps'],
      notes: 'real-db-insert',
      partner_alert: false,
    });

    expect(insertResult.error).toBeNull();

    const fetchResult = await supabase
      .from('daily_logs')
      .select('user_id, date, mood, notes')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    expect(fetchResult.error).toBeNull();
    expect(fetchResult.data?.mood).toBe('Calm');
    expect(fetchResult.data?.notes).toBe('real-db-insert');

    const updateResult = await supabase
      .from('daily_logs')
      .update({ mood: 'Focused', notes: 'real-db-updated' })
      .eq('user_id', userId)
      .eq('date', date);

    expect(updateResult.error).toBeNull();

    const verifyUpdateResult = await supabase
      .from('daily_logs')
      .select('mood, notes')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    expect(verifyUpdateResult.error).toBeNull();
    expect(verifyUpdateResult.data?.mood).toBe('Focused');
    expect(verifyUpdateResult.data?.notes).toBe('real-db-updated');

    const deleteResult = await supabase
      .from('daily_logs')
      .delete()
      .eq('user_id', userId)
      .eq('date', date);

    expect(deleteResult.error).toBeNull();

    const verifyDeleteResult = await supabase
      .from('daily_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    expect(verifyDeleteResult.error).toBeNull();
    expect(verifyDeleteResult.data).toBeNull();

    await clearUserDailyData(supabase, userId!);
  });

  it('subscribes to realtime updates when explicitly enabled', async () => {
    if (process.env.SUPABASE_TEST_ENABLE_REALTIME !== 'true') {
      return;
    }

    const signIn = await signInForCrud();

    const { supabase, userId } = signIn;
    expect(userId).toBeTruthy();

    const date = todayIso();

    const eventPromise = new Promise<boolean>((resolve) => {
      let settled = false;
      let channel: ReturnType<typeof supabase.channel> | null = null;

      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (channel) {
          void supabase.removeChannel(channel);
        }
        resolve(value);
      };

      const timeout = setTimeout(() => finish(false), 10000);

      channel = supabase
        .channel(`real-db-${userId}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'daily_logs',
            filter: `user_id=eq.${userId}`,
          },
          () => finish(true),
        )
        .subscribe();
    });

    const insertResult = await supabase.from('daily_logs').insert({
      user_id: userId,
      date,
      mood: 'Calm',
      energy_level: 'Low',
      symptoms: [],
    });
    expect(insertResult.error).toBeNull();

    const gotEvent = await eventPromise;
    expect(gotEvent).toBe(true);

    await clearUserDailyData(supabase, userId!);
  });

  it('remains consistent after delayed read windows', async () => {
    const signIn = await withTimeout(signInForCrud(), 20000, 'delayed-window sign-in');
    const { supabase, userId } = signIn;
    expect(userId).toBeTruthy();

    const date = todayIso();
    const note = `delay-check-${Date.now()}`;

    const upsert = await withTimeout(
      supabase.from('daily_logs').upsert(
        {
          user_id: userId,
          date,
          mood: 'Calm',
          energy_level: 'Low',
          symptoms: [],
          notes: note,
        },
        { onConflict: 'user_id,date' },
      ),
      20000,
      'daily_logs upsert for delayed-window consistency check',
    );
    expect(upsert.error).toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const delayedRead = await withTimeout(
      supabase
        .from('daily_logs')
        .select('notes')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle(),
      20000,
      'daily_logs delayed consistency read',
    );

    expect(delayedRead.error).toBeNull();
    expect(delayedRead.data?.notes).toBe(note);

    await clearUserDailyData(supabase, userId!);
  });
});
