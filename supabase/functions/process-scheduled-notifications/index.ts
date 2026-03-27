// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit } from '../_shared/rate-limit.ts';
import { requireInternalCaller } from '../_shared/internal-auth.ts';

import { buildNotificationTemplate } from '../_shared/notificationTemplates.ts';
import { evaluateBehavioralRule } from './rules.ts';

type ScheduledNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  route: string | null;
  status: 'pending' | 'failed' | 'processing' | 'sent' | 'suppressed';
  retry_count: number;
  max_retries: number;
  scheduled_for_utc: string;
  type: 'daily_log' | 'period_alert' | 'ovulation_alert' | 'behavioral_inactive' | 'behavioral_cycle_phase';
};

const MAX_BATCH = 100;

function nowIso(): string {
  return new Date().toISOString();
}

async function enforceDailyCap(
  admin: ReturnType<typeof createClient>,
  userId: string,
  maxPerDay: number,
): Promise<boolean> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const { count } = await admin
    .from('notification_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', 'sent')
    .gte('created_at', dayStart.toISOString());

  return (count ?? 0) < maxPerDay;
}

Deno.serve(async (req) => {
  const unauthorized = requireInternalCaller(req);
  if (unauthorized) return unauthorized;

  const rateLimited = enforceRateLimit(req, {
    scope: 'process-scheduled-notifications',
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const timestamp = nowIso();

  const { data: dueRows, error: dueError } = await admin
    .from('scheduled_notifications')
    .select('id, user_id, title, body, route, status, retry_count, max_retries, scheduled_for_utc, type')
    .in('status', ['pending', 'failed'])
    .lte('scheduled_for_utc', timestamp)
    .lt('retry_count', 4)
    .order('scheduled_for_utc', { ascending: true })
    .limit(MAX_BATCH);

  if (dueError) {
    return new Response(JSON.stringify({ ok: false, error: 'Failed to load scheduled notifications' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const notifications = (dueRows ?? []) as ScheduledNotification[];

  for (const row of notifications) {
    const { data: pref } = await admin
      .from('notification_preferences')
      .select('max_per_day')
      .eq('user_id', row.user_id)
      .maybeSingle();

    const maxPerDay = pref?.max_per_day ?? 3;
    const canSend = await enforceDailyCap(admin, row.user_id, maxPerDay);

    if (!canSend) {
      await admin.from('scheduled_notifications').update({
        status: 'suppressed',
        updated_at: nowIso(),
      }).eq('id', row.id);

      await admin.from('notification_events').insert({
        notification_id: row.id,
        user_id: row.user_id,
        event_type: 'suppressed',
        metadata: { reason: 'daily_cap_reached' },
      });
      continue;
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', row.user_id)
      .maybeSingle();

    const { data: cycle } = await admin
      .from('cycles')
      .select('current_phase')
      .eq('user_id', row.user_id)
      .is('end_date', null)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Behavioral gate to avoid noisy sends.
    if (row.type.startsWith('behavioral_')) {
      const { data: lastLog } = await admin
        .from('daily_logs')
        .select('updated_at')
        .eq('user_id', row.user_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: opensLast7 } = await admin
        .from('notification_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', row.user_id)
        .eq('event_type', 'opened')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const decision = evaluateBehavioralRule({
        lastActiveAt: lastLog?.updated_at ?? null,
        phase: (cycle?.current_phase ?? null) as 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | null,
        nowIso: timestamp,
        opensLast7Days: opensLast7 ?? 0,
        sentTodayCount: 0,
        maxPerDay,
      });

      if (!decision.shouldSend) {
        await admin.from('scheduled_notifications').update({
          status: 'suppressed',
          updated_at: nowIso(),
          last_error: decision.reason ?? 'suppressed',
        }).eq('id', row.id);

        await admin.from('notification_events').insert({
          notification_id: row.id,
          user_id: row.user_id,
          event_type: 'suppressed',
          metadata: { reason: decision.reason ?? 'suppressed' },
        });
        continue;
      }
    }

    const template = buildNotificationTemplate(row.type, {
      firstName: profile?.first_name,
      cyclePhase: (cycle?.current_phase ?? null) as 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | null,
    });

    await admin.from('scheduled_notifications').update({ status: 'processing', updated_at: nowIso() }).eq('id', row.id);

    const invokeResult = await admin.functions.invoke('send-fcm-v2', {
      headers: {
        'x-internal-token': Deno.env.get('INTERNAL_FUNCTION_TOKEN') ?? '',
      },
      body: {
        notificationId: row.id,
        userId: row.user_id,
        title: row.title || template.title,
        body: row.body || template.body,
        route: row.route ?? '/(tabs)',
      },
    });

    if (invokeResult.error) {
      await admin.from('scheduled_notifications').update({
        status: row.retry_count + 1 >= row.max_retries ? 'failed' : 'pending',
        retry_count: row.retry_count + 1,
        last_error: invokeResult.error.message,
        updated_at: nowIso(),
      }).eq('id', row.id);

      await admin.from('notification_events').insert({
        notification_id: row.id,
        user_id: row.user_id,
        event_type: 'failed',
        metadata: { error: invokeResult.error.message, retry_count: row.retry_count + 1 },
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: notifications.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
