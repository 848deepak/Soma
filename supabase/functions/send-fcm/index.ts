// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type SendRequest = {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  route?: string;
  dedupeKey?: string;
  payload?: Record<string, unknown>;
};

async function sendToFcmToken(params: {
  projectId: string;
  accessToken: string;
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
}): Promise<Response> {
  return await fetch(`https://fcm.googleapis.com/v1/projects/${params.projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token: params.token,
        notification: {
          title: params.title,
          body: params.body,
        },
        data: params.data,
      },
    }),
  });
}

Deno.serve(async (req) => {
  try {
    const projectId = Deno.env.get('FCM_PROJECT_ID');
    const accessToken = Deno.env.get('FCM_ACCESS_TOKEN');

    if (!projectId || !accessToken) {
      return new Response(JSON.stringify({ error: 'Missing FCM_PROJECT_ID or FCM_ACCESS_TOKEN' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as SendRequest;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: tokens, error: tokenError } = await admin
      .from('push_tokens')
      .select('token')
      .eq('user_id', body.userId)
      .is('revoked_at', null);

    if (tokenError) {
      throw tokenError;
    }

    if (!tokens || tokens.length === 0) {
      await admin.from('notification_events').insert({
        notification_id: body.notificationId,
        user_id: body.userId,
        event_type: 'suppressed',
        metadata: { reason: 'no_active_tokens' },
      });

      await admin.from('scheduled_notifications').update({
        status: 'suppressed',
        updated_at: new Date().toISOString(),
      }).eq('id', body.notificationId);

      return new Response(JSON.stringify({ ok: true, sent: 0, suppressed: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const item of tokens) {
      const response = await sendToFcmToken({
        projectId,
        accessToken,
        token: item.token,
        title: body.title,
        body: body.body,
        data: {
          source: 'backend',
          route: body.route ?? '/(tabs)',
          notificationId: body.notificationId,
          dedupeKey: body.dedupeKey ?? '',
        },
      });

      if (response.ok) {
        sent += 1;
      } else {
        failed += 1;
      }
    }

    const finalStatus = sent > 0 ? 'sent' : 'failed';

    await admin.from('scheduled_notifications').update({
      status: finalStatus,
      sent_at: sent > 0 ? new Date().toISOString() : null,
      last_error: failed > 0 ? `${failed} token(s) failed` : null,
      updated_at: new Date().toISOString(),
    }).eq('id', body.notificationId);

    await admin.from('notification_events').insert({
      notification_id: body.notificationId,
      user_id: body.userId,
      event_type: finalStatus,
      metadata: {
        sent,
        failed,
      },
    });

    return new Response(JSON.stringify({ ok: true, sent, failed }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
