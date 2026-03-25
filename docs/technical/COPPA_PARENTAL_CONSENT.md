# COPPA Parental Consent Operations

This runbook documents the under-13 parental consent workflow for Soma.

## Components

- Database table: `public.parental_consents`
- Client service: `src/services/parentalConsentService.ts`
- Request + email function: `request-parental-consent`
- Verification function: `verify-parental-consent`
- Auth guard: `lib/auth.ts` (`signInWithEmail` parental consent enforcement)
- Onboarding trigger: `src/screens/SetupScreen.tsx`

## Workflow

1. Child enters date of birth during setup.
2. If child is under 13, app requires parent/guardian email.
3. App invokes `request-parental-consent`; function creates `parental_consents` row with status `pending` and 7-day expiry.
4. Function sends parent email with secure verification link.
5. Parent verification link calls `verify-parental-consent` with token.
6. Function marks request `verified` if token is valid and not expired.
7. On login, under-13 users are blocked unless latest consent is verified and not revoked/expired.

## Deploy Steps

1. Apply schema:

```bash
npx supabase db query --linked --file supabase/parental_consent_schema.sql
```

2. Deploy parental consent functions:

```bash
npx supabase functions deploy request-parental-consent --project-ref <project-ref> --use-api
npx supabase functions deploy verify-parental-consent --project-ref <project-ref> --use-api
```

3. Configure secrets for email delivery:

```bash
npx supabase secrets set \
  RESEND_API_KEY=<resend_api_key> \
  PARENTAL_CONSENT_FROM_EMAIL=<verified_sender@domain.com> \
  PARENTAL_CONSENT_BASE_URL=<optional_custom_verification_url>
```

You can start from template file: `supabase/.env.secrets.example`

4. Validate table and policies:

```sql
select relname, relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and relname = 'parental_consents';

select policyname, tablename
from pg_policies
where schemaname = 'public'
  and tablename = 'parental_consents'
order by policyname;
```

## Notes

- Consent tokens should be treated as secrets and never logged.
- If `RESEND_API_KEY` or `PARENTAL_CONSENT_FROM_EMAIL` is missing, request creation still works but email delivery is skipped (`emailSent=false`).