// @ts-nocheck
/**
 * FCM Notification Sender (v2 - Production Ready)
 * 
 * Replaces the previous send-fcm function with:
 * - Dynamic token generation (no static tokens)
 * - Proper error handling
 * - Structured responses
 * - Secure credential handling
 * 
 * Secrets Required:
 * - FCM_PROJECT_ID
 * - SERVICE_ACCOUNT_JSON
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendFCMNotification, isValidFCMToken, parseFCMError, type FCMMessage } from '../_shared/fcm-client.ts';
import { enforceRateLimit } from '../_shared/rate-limit.ts';
import { requireInternalCaller } from '../_shared/internal-auth.ts';

interface SendFCMRequest {
  notificationId?: string;
  userId: string;
  deviceToken?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  route?: string;
}

interface SendFCMResponseEnvelope {
  ok: boolean;
  messageId?: string;
  error?: string;
  errorDetails?: {
    type: string;
    message: string;
    retryable: boolean;
  };
  statusCode: number;
}

Deno.serve(async (req) => {
  try {
    const unauthorized = requireInternalCaller(req);
    if (unauthorized) return unauthorized;

    const rateLimited = enforceRateLimit(req, {
      scope: 'send-fcm-v2',
      limit: 100,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    // Only POST requests allowed
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let body: SendFCMRequest;
    try {
      body = await req.json();
    } catch (_) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate required fields
    const { userId, deviceToken, title, body: msgBody, data, route, notificationId } = body;

    if (!userId || !title || !msgBody) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Missing required fields: userId, title, body',
          statusCode: 400,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Get FCM credentials from environment
    const projectId = Deno.env.get('FCM_PROJECT_ID');
    const serviceAccountJson = Deno.env.get('SERVICE_ACCOUNT_JSON');

    if (!projectId || !serviceAccountJson) {
      console.error('[send-fcm-v2] Missing FCM credentials in environment');
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'FCM not configured',
          statusCode: 500,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Log attempts/results
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let tokensToSend: string[] = [];
    if (deviceToken) {
      if (!isValidFCMToken(deviceToken)) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Invalid device token format',
            statusCode: 400,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }
      tokensToSend = [deviceToken];
    } else {
      const { data: tokenRows, error: tokenError } = await admin
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId)
        .is('revoked_at', null);
      if (tokenError) {
        return new Response(JSON.stringify({ ok: false, error: 'Failed to load device tokens', statusCode: 500 }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      tokensToSend = (tokenRows ?? []).map((row) => row.token).filter((token) => isValidFCMToken(token));
    }

    if (tokensToSend.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0, suppressed: true, statusCode: 200 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    let failed = 0;
    let lastMessageId: string | undefined;
    let lastError: string | undefined;
    let lastErrorDetails: SendFCMResponseEnvelope['errorDetails'] | undefined;

    for (const token of tokensToSend) {
      const fcmResponse = await sendFCMNotification(
        { projectId, serviceAccountJson },
        {
          token,
          title,
          body: msgBody,
          data,
          route,
        } as FCMMessage,
      );

      if (fcmResponse.success) {
        sent += 1;
        lastMessageId = fcmResponse.messageId;
      } else {
        failed += 1;
        lastError = fcmResponse.error ?? 'Failed to deliver';
        lastErrorDetails = fcmResponse.error ? parseFCMError(fcmResponse.error) : undefined;
      }
    }

    const logEntry = {
      notification_id: notificationId || null,
      user_id: userId,
      event_type: sent > 0 ? 'sent' : 'failed',
      metadata: {
        target_count: tokensToSend.length,
        sent,
        failed,
        fcm_message_id: lastMessageId,
        error: lastError,
        error_type: lastErrorDetails?.type,
      },
    };

    admin.from('notification_events').insert(logEntry).catch((err) => {
      console.error('[send-fcm-v2] Failed to log notification event:', err.message);
    });

    // Return response
    const responseEnvelope: SendFCMResponseEnvelope & { sent: number; failed: number } = {
      ok: sent > 0,
      messageId: lastMessageId,
      error: lastError,
      errorDetails: lastErrorDetails,
      statusCode: sent > 0 ? 200 : 500,
      sent,
      failed,
    };

    return new Response(JSON.stringify(responseEnvelope), {
      status: sent > 0 ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-fcm-v2] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Internal server error',
        statusCode: 500,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
