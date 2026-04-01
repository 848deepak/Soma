import {
  clearUserDailyData,
  createRealSupabaseClient,
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

describeReal('Real User Flow (Auth + Data)', () => {
  const testEmail = process.env.SUPABASE_TEST_USER_EMAIL;
  const testPassword = process.env.SUPABASE_TEST_PASSWORD;

  beforeAll(() => {
    if (!testEmail || !testPassword) {
      throw new Error(
        'Real flow test requires pre-created test user credentials. Set SUPABASE_TEST_USER_EMAIL and SUPABASE_TEST_PASSWORD to a pre-provisioned test account.',
      );
    }
  });

  it('runs signup -> login -> session -> log write/read and optional partner step', async () => {
    const supabase = createRealSupabaseClient();
    const email = testEmail!;
    const password = testPassword!;

    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (signIn.error) {
      if (signIn.error.message.toLowerCase().includes('email not confirmed')) {
        throw new Error(
          'Real flow test requires email confirmation disabled in the dedicated test Supabase project.',
        );
      }
      throw signIn.error;
    }

    const userId = signIn.data.user?.id;
    expect(userId).toBeTruthy();

    const session = await supabase.auth.getSession();
    expect(session.error).toBeNull();
    expect(session.data.session?.user.id).toBe(userId);

    const date = todayIso();
    const writeLog = await supabase.from('daily_logs').upsert(
      {
        user_id: userId,
        date,
        flow_level: 2,
        mood: 'Happy',
        energy_level: 'High',
        symptoms: ['Energized'],
        notes: 'real-flow-log',
      },
      { onConflict: 'user_id,date' },
    );
    expect(writeLog.error).toBeNull();

    const readLog = await supabase
      .from('daily_logs')
      .select('user_id, date, mood, energy_level, notes')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    expect(readLog.error).toBeNull();
    expect(readLog.data?.mood).toBe('Happy');
    expect(readLog.data?.notes).toBe('real-flow-log');

    if (process.env.SUPABASE_TEST_ENABLE_PARTNER_FLOW === 'true') {
      const partnerCodeResult = await supabase.rpc('generate_partner_code');
      expect(partnerCodeResult.error).toBeNull();
      expect(typeof partnerCodeResult.data).toBe('string');
    }

    await clearUserDailyData(supabase, userId!);

    const signOut = await supabase.auth.signOut();
    expect(signOut.error).toBeNull();
  });
});
