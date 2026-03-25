// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await req.json();
    const { token, tokenType, deviceType, timezone, revoke } = body as {
      token: string;
      tokenType?: string;
      deviceType?: 'ios' | 'android' | 'web';
      timezone?: string;
      revoke?: boolean;
    };

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (revoke) {
      await admin
        .from('push_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('token', token);

      return new Response(JSON.stringify({ ok: true, revoked: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error } = await admin.from('push_tokens').upsert(
      {
        user_id: user.id,
        token,
        token_type: tokenType ?? 'unknown',
        device_type: deviceType ?? 'android',
        timezone: timezone ?? 'UTC',
        last_seen_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: 'token' },
    );

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
