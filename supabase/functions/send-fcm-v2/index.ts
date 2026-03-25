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

interface SendFCMRequest {
  notificationId?: string;
  userId: string;
  deviceToken: string;
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

    if (!userId || !deviceToken || !title || !msgBody) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Missing required fields: userId, deviceToken, title, body',
          statusCode: 400,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Validate token format
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

    // Send notification via FCM
    const fcmResponse = await sendFCMNotification(
      { projectId, serviceAccountJson },
      {
        token: deviceToken,
        title,
        body: msgBody,
        data,
        route,
      } as FCMMessage,
    );

    // If failed, parse error details
    let errorDetails = undefined;
    if (!fcmResponse.success && fcmResponse.error) {
      errorDetails = parseFCMError(fcmResponse.error);
    }

    // Log attempt (async, don't block response)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const logEntry = {
      notification_id: notificationId || null,
      user_id: userId,
      event_type: fcmResponse.success ? 'sent' : 'failed',
      metadata: {
        device_token_length: deviceToken.length,
        fcm_message_id: fcmResponse.messageId,
        error: fcmResponse.error,
        error_type: errorDetails?.type,
      },
    };

    admin.from('notification_events').insert(logEntry).catch((err) => {
      console.error('[send-fcm-v2] Failed to log notification event:', err.message);
    });

    // Return response
    const responseEnvelope: SendFCMResponseEnvelope = {
      ok: fcmResponse.success,
      messageId: fcmResponse.messageId,
      error: fcmResponse.error,
      errorDetails,
      statusCode: fcmResponse.statusCode || (fcmResponse.success ? 200 : 500),
    };

    return new Response(JSON.stringify(responseEnvelope), {
      status: fcmResponse.statusCode || (fcmResponse.success ? 200 : 500),
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
