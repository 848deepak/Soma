// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit } from '../_shared/rate-limit.ts';

const TOKEN_HEX_PATTERN = /^[a-f0-9]{64}$/;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function verifyByToken(token: string): Promise<
  | { ok: true; alreadyVerified: boolean }
  | { ok: false; status: number; message: string }
> {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: existing, error: fetchError } = await admin
    .from('parental_consents')
    .select('id,status,expires_at')
    .eq('verification_token', token)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, status: 404, message: 'Consent request not found' };
  }

  if (existing.status === 'verified') {
    return { ok: true, alreadyVerified: true };
  }

  if (existing.status === 'revoked') {
    return { ok: false, status: 409, message: 'Consent was revoked' };
  }

  const isExpired = new Date(existing.expires_at).getTime() < Date.now();
  if (isExpired) {
    await admin
      .from('parental_consents')
      .update({ status: 'expired' })
      .eq('id', existing.id);
    return { ok: false, status: 410, message: 'Consent request expired' };
  }

  const { error: updateError } = await admin
    .from('parental_consents')
    .update({
      status: 'verified',
      verified_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (updateError) {
    return { ok: false, status: 500, message: updateError.message };
  }

  return { ok: true, alreadyVerified: false };
}

Deno.serve(async (req) => {
  try {
    const rateLimited = enforceRateLimit(req, {
      scope: 'verify-parental-consent',
      limit: 5,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const url = new URL(req.url);

    if (req.method === 'GET') {
      const token = url.searchParams.get('token')?.trim() ?? '';
      if (!TOKEN_HEX_PATTERN.test(token)) {
        return htmlResponse('<h2>Invalid verification link</h2><p>Please request a new parental consent email.</p>', 400);
      }

      const result = await verifyByToken(token);
      if (!result.ok) {
        return htmlResponse(`<h2>Verification failed</h2><p>${result.message}</p>`, result.status);
      }

      const title = result.alreadyVerified ? 'Already verified' : 'Consent verified';
      const detail = result.alreadyVerified
        ? 'This parental consent request was already approved.'
        : 'Parental consent has been successfully verified.';
      return htmlResponse(`<h2>${title}</h2><p>${detail}</p>`, 200);
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const payload = await req.json().catch(() => ({}));
    const token = typeof payload?.token === 'string' ? payload.token.trim() : '';

    if (!TOKEN_HEX_PATTERN.test(token)) {
      return jsonResponse({ error: 'Invalid token' }, 400);
    }

    const result = await verifyByToken(token);
    if (!result.ok) {
      return jsonResponse({ error: result.message }, result.status);
    }

    return jsonResponse({ verified: true, alreadyVerified: result.alreadyVerified });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});
