# RLS Regression Checklist

Purpose: prevent privacy regressions when schema, policies, partner sharing, or sync code changes.

## Preconditions

- Run latest `supabase/schema.sql` and `supabase/rls_policies.sql` on staging.
- Have 3 users ready:
  - `owner_user`
  - `partner_user`
  - `stranger_user`
- Link owner and partner with active relationship using app flow (not direct SQL) unless test says otherwise.

## Required checks (manual + SQL)

1. Owner can CRUD only own rows
- `profiles`: owner can read/update own profile.
- `cycles`: owner can read/insert/update/delete own cycles.
- `daily_logs`: owner can read/insert/update/delete own logs.
- `partners`: owner can read/update/delete own partner rows.

2. Stranger cannot access other users' raw health data
- No `select` access to owner `daily_logs`.
- No `select` access to owner `cycles`.
- No `update/delete` access to owner rows anywhere.

3. Partner access is view-limited only
- Partner reads `partner_visible_logs` for owner when relationship status is `active`.
- Partner cannot query owner rows directly from `daily_logs`.
- `notes`, `hydration_glasses`, `sleep_hours` are never exposed via view.

4. Permission toggles are enforced
- `share_mood = false` => `mood` returns `null` via view.
- `share_symptoms = false` => `symptoms` returns empty array.
- `share_fertility = false` => `fertility_flow_level` returns `null`.

5. Relationship lifecycle rules
- `pending` relation must not expose partner view data.
- `revoked` relation must not expose partner view data.
- Re-linking to `active` restores view data.

6. RPC safety
- `link_partner(text)`:
  - rejects invalid code
  - rejects self-link
  - only creates/updates expected relationship rows

7. Offline sync safety
- Offline upsert queued in local DB does not bypass RLS after reconnect.
- Replayed queue writes only succeed for authenticated owner rows.
- Failed replay increments attempt count and does not leak payload data.

## Release gate

Pass criteria for production release:

- All checks in this checklist pass in staging.
- Jest suite passes (`npm test -- --runInBand`).
- Typecheck passes (`npm run typecheck`).
- Any policy/schema changes include updated checklist evidence in PR notes.

## Suggested PR template snippet

- [ ] Ran `supabase/rls_smoke_tests.sql` on staging
- [ ] Verified partner privacy field masking in `partner_visible_logs`
- [ ] Verified stranger cannot read owner `daily_logs` or `cycles`
- [ ] Jest passing
- [ ] Typecheck passing
