// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type RequestPayload = {
  parentEmail?: string;
  childDateOfBirth?: string;
};

const TOKEN_BYTES = 32;
const MAX_REQUESTS_PER_HOUR = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function generateConsentTokenHex(bytes = TOKEN_BYTES): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => value.toString(16).padStart(2, '0')).join('');
}

function expiryIso(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

async function sendVerificationEmail(
  parentEmail: string,
  verificationLink: string,
): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('PARENTAL_CONSENT_FROM_EMAIL');

  if (!apiKey || !fromEmail) {
    return false;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [parentEmail],
      subject: 'Parental consent request for Soma',
      html: `
        <p>Hello,</p>
        <p>A child has requested parental consent to use Soma.</p>
        <p>Please review and confirm by clicking the secure link below:</p>
        <p><a href="${verificationLink}">Verify parental consent</a></p>
        <p>This link expires in 7 days.</p>
      `,
      text: `A child requested parental consent for Soma. Verify here: ${verificationLink}. This link expires in 7 days.`,
    }),
  });

  return response.ok;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    const payload = (await req.json()) as RequestPayload;
    const parentEmail = payload.parentEmail?.trim().toLowerCase() ?? '';
    const childDateOfBirth = payload.childDateOfBirth?.trim() || null;

    if (!parentEmail || !EMAIL_PATTERN.test(parentEmail)) {
      return jsonResponse({ error: 'Valid parentEmail is required' }, 400);
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await admin
      .from('parental_consents')
      .select('id', { count: 'exact', head: true })
      .eq('child_id', user.id)
      .gte('requested_at', oneHourAgoIso);

    if ((recentCount ?? 0) >= MAX_REQUESTS_PER_HOUR) {
      return jsonResponse(
        { error: 'Too many consent requests. Please wait before requesting again.' },
        429,
      );
    }

    const { data: existingPending } = await admin
      .from('parental_consents')
      .select('id,expires_at')
      .eq('child_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPending) {
      return jsonResponse({
        requestId: existingPending.id,
        expiresAt: existingPending.expires_at,
        deduped: true,
        emailSent: true,
      });
    }

    const verificationToken = generateConsentTokenHex();
    const expiresAt = expiryIso(7);

    const { data: inserted, error: insertError } = await admin
      .from('parental_consents')
      .insert({
        child_id: user.id,
        parent_email: parentEmail,
        verification_token: verificationToken,
        status: 'pending',
        child_date_of_birth: childDateOfBirth,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (insertError || !inserted?.id) {
      return jsonResponse({ error: insertError?.message ?? 'Could not create request' }, 500);
    }

    const baseUrl = Deno.env.get('PARENTAL_CONSENT_BASE_URL')?.trim();
    const verifyUrl =
      baseUrl && baseUrl.length > 0
        ? `${baseUrl.replace(/\/$/, '')}?token=${encodeURIComponent(verificationToken)}`
        : `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-parental-consent?token=${encodeURIComponent(verificationToken)}`;

    const emailSent = await sendVerificationEmail(parentEmail, verifyUrl);

    return jsonResponse({
      requestId: inserted.id,
      expiresAt,
      deduped: false,
      emailSent,
      parentEmailMasked: maskEmail(parentEmail),
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});
