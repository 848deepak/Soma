// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit } from '../_shared/rate-limit.ts';

type CancelPayload = {
  requestId?: string;
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
    const rateLimited = enforceRateLimit(req, {
      scope: 'cancel-data-rights-request',
      limit: 10,
      windowMs: 1000,
    });
    if (rateLimited) return rateLimited;

    if (!hasAllowedOrigin(req)) {
      return jsonResponse({ error: 'Origin not allowed' }, 403);
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
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

    const body = (await req.json()) as CancelPayload;
    if (!body.requestId || typeof body.requestId !== 'string') {
      return jsonResponse({ error: 'requestId is required' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: existing, error: fetchError } = await admin
      .from('data_rights_requests')
      .select('id,user_id,status')
      .eq('id', body.requestId)
      .maybeSingle();

    if (fetchError) {
      return jsonResponse({ error: fetchError.message }, 500);
    }

    if (!existing || existing.user_id !== user.id) {
      return jsonResponse({ error: 'Request not found' }, 404);
    }

    if (!['pending', 'in_progress'].includes(existing.status)) {
      return jsonResponse({ error: 'Only pending or in-progress requests can be cancelled' }, 409);
    }

    const { data: updated, error: updateError } = await admin
      .from('data_rights_requests')
      .update({
        status: 'cancelled',
        processed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('user_id', user.id)
      .select('id,status,processed_at')
      .single();

    if (updateError || !updated) {
      return jsonResponse(
        { error: updateError?.message ?? 'Could not cancel request' },
        500,
      );
    }

    await admin.from('data_rights_request_events').insert({
      request_id: existing.id,
      user_id: user.id,
      actor_type: 'user',
      actor_id: user.id,
      event_type: 'cancelled',
      old_status: existing.status,
      new_status: updated.status,
      metadata: {
        source: 'cancel-data-rights-request',
      },
    });

    return jsonResponse({
      requestId: updated.id,
      status: updated.status,
      processedAt: updated.processed_at,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});
