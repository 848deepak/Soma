// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit } from '../_shared/rate-limit.ts';

type ProcessPayload = {
  requestId?: string;
  status?: 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  processorNote?: string;
  resultLocation?: string;
};

const ADMIN_HEADER_SKEW_SECONDS = 5 * 60;
const ADMIN_NONCE_TTL_MS = 10 * 60 * 1000;
const seenAdminNonces = new Map<string, number>();

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

function isTerminalStatus(status: string): boolean {
  return ['completed', 'rejected', 'cancelled'].includes(status);
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const maxLength = Math.max(aBytes.length, bBytes.length);

  // Compare across the full max length to avoid early exits.
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < maxLength; i += 1) {
    const aByte = i < aBytes.length ? aBytes[i] : 0;
    const bByte = i < bBytes.length ? bBytes[i] : 0;
    diff |= aByte ^ bByte;
  }

  return diff === 0;
}

function cleanupExpiredNonces(nowMs: number): void {
  for (const [nonce, expiresAt] of seenAdminNonces.entries()) {
    if (expiresAt <= nowMs) {
      seenAdminNonces.delete(nonce);
    }
  }
}

function validateAdminRequestFreshness(req: Request): Response | null {
  const timestampHeader = req.headers.get('x-admin-timestamp')?.trim();
  const nonceHeader = req.headers.get('x-admin-nonce')?.trim();

  if (!timestampHeader || !nonceHeader) {
    return jsonResponse({ error: 'Missing admin freshness headers' }, 401);
  }

  if (nonceHeader.length < 16) {
    return jsonResponse({ error: 'Invalid admin nonce' }, 401);
  }

  const timestampSeconds = Number(timestampHeader);
  if (!Number.isFinite(timestampSeconds)) {
    return jsonResponse({ error: 'Invalid admin timestamp' }, 401);
  }

  const nowMs = Date.now();
  const nowSeconds = Math.floor(nowMs / 1000);
  if (Math.abs(nowSeconds - Math.floor(timestampSeconds)) > ADMIN_HEADER_SKEW_SECONDS) {
    return jsonResponse({ error: 'Stale admin request timestamp' }, 401);
  }

  cleanupExpiredNonces(nowMs);
  if (seenAdminNonces.has(nonceHeader)) {
    return jsonResponse({ error: 'Replay detected' }, 409);
  }

  // Best-effort replay defense at function-instance scope.
  seenAdminNonces.set(nonceHeader, nowMs + ADMIN_NONCE_TTL_MS);
  return null;
}

Deno.serve(async (req) => {
  try {
    const rateLimited = enforceRateLimit(req, {
      scope: 'process-data-rights-request',
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

    const adminToken = Deno.env.get('DATA_RIGHTS_ADMIN_TOKEN');
    if (!adminToken) {
      return jsonResponse({ error: 'Missing DATA_RIGHTS_ADMIN_TOKEN in function secrets' }, 500);
    }

    const tokenHeader = req.headers.get('x-admin-token')?.trim();
    if (!tokenHeader || !timingSafeEqual(tokenHeader, adminToken)) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const freshnessError = validateAdminRequestFreshness(req);
    if (freshnessError) return freshnessError;

    const body = (await req.json()) as ProcessPayload;
    const requestId = body.requestId;
    const status = body.status;
    const processorNote = body.processorNote?.trim() || null;
    const resultLocation = body.resultLocation?.trim() || null;

    if (!requestId || typeof requestId !== 'string') {
      return jsonResponse({ error: 'requestId is required' }, 400);
    }

    if (!status || !['in_progress', 'completed', 'rejected', 'cancelled'].includes(status)) {
      return jsonResponse({ error: 'Invalid status' }, 400);
    }

    if (processorNote && processorNote.length > 1000) {
      return jsonResponse({ error: 'processorNote too long' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: existing, error: existingError } = await admin
      .from('data_rights_requests')
      .select('id,status,request_type')
      .eq('id', requestId)
      .maybeSingle();

    if (existingError) {
      return jsonResponse({ error: existingError.message }, 500);
    }

    if (!existing) {
      return jsonResponse({ error: 'Request not found' }, 404);
    }

    if (existing.status === 'completed' || existing.status === 'rejected' || existing.status === 'cancelled') {
      return jsonResponse({ error: 'Request already finalized' }, 409);
    }

    if (status === 'completed' && existing.request_type === 'export' && !resultLocation) {
      return jsonResponse({ error: 'resultLocation is required when completing export requests' }, 400);
    }

    const updatePayload: Record<string, unknown> = {
      status,
      processor_note: processorNote,
      updated_at: new Date().toISOString(),
    };

    if (resultLocation) {
      updatePayload.result_location = resultLocation;
    }

    if (isTerminalStatus(status)) {
      updatePayload.processed_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await admin
      .from('data_rights_requests')
      .update(updatePayload)
      .eq('id', requestId)
      .select('id,user_id,status,processed_at,result_location,processor_note')
      .single();

    if (updateError || !updated) {
      return jsonResponse(
        { error: updateError?.message ?? 'Could not update request' },
        500,
      );
    }

    await admin.from('data_rights_request_events').insert({
      request_id: requestId,
      user_id: updated.user_id,
      actor_type: 'operator',
      actor_id: 'admin_token',
      event_type: resultLocation ? 'result_linked' : 'status_changed',
      old_status: existing.status,
      new_status: status,
      metadata: {
        has_processor_note: Boolean(processorNote),
        has_result_location: Boolean(resultLocation),
      },
    });

    return jsonResponse({
      request: updated,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});
