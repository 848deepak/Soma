// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type ProcessPayload = {
  requestId?: string;
  status?: 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  processorNote?: string;
  resultLocation?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isTerminalStatus(status: string): boolean {
  return ['completed', 'rejected', 'cancelled'].includes(status);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const adminToken = Deno.env.get('DATA_RIGHTS_ADMIN_TOKEN');
    if (!adminToken) {
      return jsonResponse({ error: 'Missing DATA_RIGHTS_ADMIN_TOKEN in function secrets' }, 500);
    }

    const tokenHeader = req.headers.get('x-admin-token');
    if (!tokenHeader || tokenHeader !== adminToken) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

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
