// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type RequestPayload = {
  requestType?: 'export' | 'deletion';
  requestNote?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function hasAllowedOrigin(req: Request): boolean {
  const allowedOriginsRaw = Deno.env.get('ALLOWED_ORIGINS')?.trim();
  if (!allowedOriginsRaw) return true;

  const origin = req.headers.get('Origin')?.trim();
  if (!origin) return true;

  const allowedOrigins = allowedOriginsRaw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return allowedOrigins.includes(origin);
}

Deno.serve(async (req) => {
  try {
    if (!hasAllowedOrigin(req)) {
      return jsonResponse({ error: 'Origin not allowed' }, 403);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const payload = (await req.json()) as RequestPayload;
    const requestType = payload.requestType;
    const requestNote = payload.requestNote?.trim() ?? null;

    if (requestType !== 'export' && requestType !== 'deletion') {
      return jsonResponse({ error: 'Invalid request type' }, 400);
    }

    if (requestNote && requestNote.length > 500) {
      return jsonResponse({ error: 'Request note is too long' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: existingPending } = await admin
      .from('data_rights_requests')
      .select('id,status,request_type,requested_at')
      .eq('user_id', user.id)
      .eq('request_type', requestType)
      .in('status', ['pending', 'in_progress'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPending) {
      return jsonResponse({
        requestId: existingPending.id,
        status: existingPending.status,
        deduped: true,
      });
    }

    const { data: inserted, error: insertError } = await admin
      .from('data_rights_requests')
      .insert({
        user_id: user.id,
        request_type: requestType,
        status: 'pending',
        request_note: requestNote,
      })
      .select('id,status')
      .single();

    if (insertError || !inserted) {
      return jsonResponse(
        { error: insertError?.message ?? 'Could not create request' },
        500,
      );
    }

    await admin.from('data_rights_request_events').insert({
      request_id: inserted.id,
      user_id: user.id,
      actor_type: 'user',
      actor_id: user.id,
      event_type: 'created',
      old_status: null,
      new_status: inserted.status,
      metadata: {
        request_type: requestType,
        has_note: Boolean(requestNote),
      },
    });

    return jsonResponse({
      requestId: inserted.id,
      status: inserted.status,
      deduped: false,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});
