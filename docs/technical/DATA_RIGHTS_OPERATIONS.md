# Data Rights Operations Runbook

This runbook documents operational handling for GDPR/CCPA-style data rights requests in Soma.

## Scope

- User submission endpoint: `data-rights-request`
- User cancellation endpoint: `cancel-data-rights-request`
- Operator processing endpoint: `process-data-rights-request`
- Data table: `public.data_rights_requests`
- Audit table: `public.data_rights_request_events`

## Required Secrets

Set these in Supabase project secrets:

- `DATA_RIGHTS_ADMIN_TOKEN`: shared secret for operator processing calls.

## Request Lifecycle

Valid statuses:

- `pending`
- `in_progress`
- `completed`
- `rejected`
- `cancelled`

Rules:

- Users can submit export/deletion requests.
- Users can cancel only `pending` or `in_progress` requests.
- Operators process requests through `process-data-rights-request`.
- Export requests should include `resultLocation` when marked `completed`.

## Operator API Example

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/process-data-rights-request" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon-or-service-key>" \
  -H "apikey: <anon-or-service-key>" \
  -H "x-admin-token: <DATA_RIGHTS_ADMIN_TOKEN>" \
  -d '{
    "requestId": "<uuid>",
    "status": "completed",
    "processorNote": "Export prepared and uploaded",
    "resultLocation": "https://..."
  }'
```

## SQL Audit Queries

Latest requests:

```sql
select id, user_id, request_type, status, requested_at, processed_at
from public.data_rights_requests
order by requested_at desc
limit 50;
```

Stale requests (`pending` > 7 days):

```sql
select id, user_id, request_type, status, requested_at
from public.data_rights_requests
where status = 'pending'
  and requested_at < now() - interval '7 days'
order by requested_at asc;
```

Latest audit events:

```sql
select request_id, actor_type, event_type, old_status, new_status, created_at
from public.data_rights_request_events
order by created_at desc
limit 100;
```

## Security Notes

- Never store admin token in source control.
- Rotate `DATA_RIGHTS_ADMIN_TOKEN` regularly.
- Rotate Supabase access tokens if exposed in terminal history.
- Prefer short-lived signed URLs for export artifacts in `resultLocation`.
