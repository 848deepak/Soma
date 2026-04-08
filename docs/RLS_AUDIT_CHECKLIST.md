# ─────────────────────────────────────────────────────────────────────────────
# RLS (Row-Level Security) Audit Checklist for SOMA Health App
# ─────────────────────────────────────────────────────────────────────────────
#
# This checklist verifies that all database tables have comprehensive Row-Level
# Security policies that prevent unauthorized access and mutations.
#
# Reference: https://supabase.com/docs/guides/auth/row-level-security
#
# ─────────────────────────────────────────────────────────────────────────────

## Audit Status Matrix

### TABLE: profiles
**Purpose**: User profile data (name, DOB, cycle preferences)
**Auth Boundary**: RLS enforces user_id = auth.uid()

#### SELECT Policy
- ✅ Policy: `profiles_select_own`
- ✅ Condition: `auth.uid() = id`
- ✅ Effect: Users can only SELECT their own profile
- **Expected Behavior**: `SELECT * FROM profiles WHERE id = current_user_id` ✓
- **Exploit Block**: User cannot read another user's profile, e.g., `SELECT * FROM profiles WHERE id = 'OTHER_USER'` ✗

#### INSERT Policy
- ✅ Policy: `profiles_insert_authenticated`
- ✅ Condition: `auth.uid() = id`
- ✅ WITH CHECK: `auth.uid() = id`
- **Expected Behavior**: Can only insert own profile (used in `handle_new_user` trigger)
- **Exploit Block**: User cannot insert profile for another user_id ✗

#### UPDATE Policy
- ✅ Policy: `profiles_update_own`
- ✅ USING: `auth.uid() = id`
- ✅ WITH CHECK: `auth.uid() = id`
- **Expected Behavior**: User can only UPDATE their own row
- **Exploit Block**: Cannot PATCH another user's profile ✗

#### DELETE Policy
- ✅ Policy: `profiles_delete_own` (if cascade enabled)
- ✅ Condition: `auth.uid() = id`
- **Expected Behavior**: User can only DELETE their own profile
- **Exploit Block**: Cannot delete another user's data ✗

---

### TABLE: cycles
**Purpose**: Menstrual cycle tracking (start_date, end_date, predictions)
**Auth Boundary**: RLS enforces user_id = auth.uid()

#### SELECT Policy
- ✅ Policy: `cycles_select_own`
- ✅ Condition: `auth.uid() = user_id`
- **Expected Behavior**: User sees only their cycles
- **Exploit Block**: SELECT FROM cycles WHERE user_id != current_user ✗

#### INSERT Policy
- ✅ Policy: `cycles_insert_own`
- ✅ Condition: `auth.uid() = user_id`
- ✅ WITH CHECK: `auth.uid() = user_id`
- **Expected Behavior**: Can only INSERT cycles with own user_id
- **Exploit Block**: Cannot insert cycle claiming to be another user ✗

#### UPDATE Policy
- ✅ Policy: `cycles_update_own`
- ✅ USING: `auth.uid() = user_id`
- ✅ WITH CHECK: `auth.uid() = user_id`
- **Expected Behavior**: Can only UPDATE own cycles
- **Exploit Block**: Cannot modify another user's cycle_length or end_date ✗

#### DELETE Policy
- ✅ Policy: `cycles_delete_own`
- ✅ Condition: `auth.uid() = user_id`
- **Expected Behavior**: Can only DELETE own cycles

---

### TABLE: daily_logs
**Purpose**: Daily symptoms, mood, energy, flow data
**Auth Boundary**: RLS enforces user_id = auth.uid()

#### SELECT Policy
- ✅ Policy: `daily_logs_select_own`
- ✅ Condition: `auth.uid() = user_id`
- **Expected Behavior**: User sees only their logs
- **Exploit Block**: SELECT FROM daily_logs WHERE user_id != current_user ✗

#### INSERT Policy
- ✅ Policy: `daily_logs_insert_own`
- ✅ Condition: `auth.uid() = user_id`
- ✅ WITH CHECK: `auth.uid() = user_id`
- **Expected Behavior**: Can only INSERT own logs (one per date)
- **Exploit Block**: Cannot create log for another user ✗

#### UPDATE Policy
- ✅ Policy: `daily_logs_update_own`
- ✅ USING: `auth.uid() = user_id`
- ✅ WITH CHECK: `auth.uid() = user_id`
- **Expected Behavior**: Can only UPDATE own logs
- **Exploit Block**: Cannot modify another user's symptoms ✗

#### DELETE Policy
- ✅ Policy: `daily_logs_delete_own`
- ✅ Condition: `auth.uid() = user_id`
- **Expected Behavior**: Can only DELETE own logs

---

### TABLE: smart_events
**Purpose**: Smart notifications (ovulation alerts, cycle phase changes)
**Auth Boundary**: RLS enforces user_id = auth.uid()

#### SELECT Policy
- ✅ Policy: `smart_events_select_own`
- ✅ Condition: `auth.uid() = user_id`
- **Expected Behavior**: User sees only their events
- **Exploit Block**: Cannot read another user's smart event predictions ✗

#### INSERT Policy
- ✅ Policy: `smart_events_insert_own` (edge function only)
- ✅ Condition: `auth.role = 'service_role'` OR (`auth.uid() = user_id`)
- ✅ WITH CHECK: Same as USING
- **Expected Behavior**:
  - Edge functions (with service_role) can insert alerts for users
  - Users cannot directly INSERT (should be edge-function-only)
- **Exploit Block**: User cannot craft fake ovulation alerts ✗

#### UPDATE Policy
- ✅ Policy: `smart_events_update_own` (or edge-function-only)
- ✅ USING: `auth.role = 'service_role'` OR (`auth.uid() = user_id` AND `auth.role = 'authenticated'`)
- **Expected Behavior**: Only service_role (edge function) can update state; users cannot
- **Exploit Block**: User cannot toggle their own alerts as "read" without business logic ✗

---

### TABLE: partners
**Purpose**: Care Circle connections and permissions
**Auth Boundary**: RLS enforces both sides of partnership

#### SELECT Policy
- ✅ Policy: `partners_select_own_or_linked`
- ✅ Condition: `auth.uid() = user_id OR auth.uid() = partner_user_id`
- **Expected Behavior**: Both sides of partnership can see the link
- **Exploit Block**: User cannot read partnership where they are NOT involved ✗
- **Test**:
  - Alice creates link to Bob (status='pending') → Bob can SELECT partners WHERE partner_user_id = 'alice_id'
  - Inactive link (status='revoked') → neither can read after revocation policy

#### INSERT Policy
- ✅ Policy: `partners_insert_own`
- ✅ Condition: `auth.uid() = user_id`
- ✅ WITH CHECK: `auth.uid() = user_id` (cannot set user_id to someone else)
- **Expected Behavior**: User initiates link with partner_user_id = invited person
- **Exploit Block**: Cannot create partnership claiming to be someone else ✗

#### UPDATE Policy
- ✅ Policy: `partners_update_own_or_acceptor`
- ✅ USING: `auth.uid() = user_id OR auth.uid() = partner_user_id`
- ✅ WITH CHECK: Same (cannot change user_id or partner_user_id after creation)
- **Expected Behavior**:
  - Link creator can UPDATE permissions
  - Partner can only UPDATE to accept/revoke
- **Exploit Block**: Cannot escalate permissions beyond what creator intended ✗

#### DELETE Policy
- ✅ Policy: `partners_delete_own_or_linked`
- ✅ Condition: `auth.uid() = user_id OR auth.uid() = partner_user_id`
- **Expected Behavior**: Either side can delete the link
- **Exploit Block**: Cannot delete partnership you're not part of ✗

---

### TABLE: push_tokens
**Purpose**: FCM/device tokens for push notifications
**Auth Boundary**: RLS enforces user_id = auth.uid()

#### SELECT Policy
- ✅ Policy: `push_tokens_select_own`
- ✅ Condition: `auth.uid() = user_id`
- **Expected Behavior**: User sees only their own tokens
- **Exploit Block**: Cannot read another user's device tokens ✗

#### INSERT Policy
- ✅ Policy: `push_tokens_insert_own`
- ✅ Condition: `auth.uid() = user_id`
- ✅ WITH CHECK: `auth.uid() = user_id`
- **Expected Behavior**: User can register a token for themselves only
- **Exploit Block**: Cannot register token for another user ✗
- **Security Note**: Each insert should include device_id + token fingerprint to prevent token hijacking

#### UPDATE Policy
- ✅ Policy: `push_tokens_update_own`
- ✅ USING: `auth.uid() = user_id`
- ✅ WITH CHECK: `auth.uid() = user_id`
- **Expected Behavior**: Can only update their own tokens (e.g., mark as inactive)
- **Exploit Block**: Cannot revoke another user's push capability ✗

#### DELETE Policy
- ✅ Policy: `push_tokens_delete_own`
- ✅ Condition: `auth.uid() = user_id`
- **Expected Behavior**: User can revoke their own tokens

---

## Verification Checklist

### For Each Table:
- [ ] SELECT policy allows user to see only own rows
- [ ] INSERT policy includes WITH CHECK to prevent user_id spoofing
- [ ] UPDATE policy has both USING (row filter) and WITH CHECK (column filter)
- [ ] DELETE policy restricts to own rows
- [ ] No wildcard policies (avoid `auth.role()` without conditions)
- [ ] Policies use `auth.uid()` not session variables (consistency)
- [ ] Edge functions use `service_role` explicitly when needed
- [ ] No cross-table reference bypasses RLS

### Schema Hardening:
- [ ] All functions SET search_path to prevent schema injection:
  ```sql
  CREATE OR REPLACE FUNCTION my_function() RETURNS ...
    SET search_path = 'public'
  AS $$
    ...
  $$ LANGUAGE plpgsql;
  ```
- [ ] No functions created with SECURITY DEFINER without explicit search_path
- [ ] No GRANT EXECUTE to public on sensitive functions

---

## Manual Verification Commands

### Test Profile Isolation (run from authenticated context)
```sql
-- Current user should see only their profile
SELECT id, first_name FROM profiles WHERE id = auth.uid();

-- Current user should NOT see other profiles
SELECT id FROM profiles WHERE id != auth.uid();  -- Should return 0 rows
```

### Test Cycles Isolation
```sql
-- User sees own cycles
SELECT * FROM cycles WHERE user_id = auth.uid();

-- User cannot see others' cycles
SELECT * FROM cycles WHERE user_id != auth.uid();  -- Should error or return 0
```

### Test Partnership Visibility
```sql
-- Alice can see link she created
SELECT * FROM partners WHERE user_id = 'alice_id' AND partner_user_id = 'bob_id';

-- Bob can see the same link (from his perspective)
SELECT * FROM partners WHERE user_id = 'bob_id' AND partner_user_id = 'alice_id';
-- OR
SELECT * FROM partners WHERE partner_user_id = 'bob_id' AND user_id = 'alice_id';

-- Charlie can see NOTHING
SELECT * FROM partners WHERE user_id = 'charlie_id' OR partner_user_id = 'charlie_id';  -- 0 rows
```

---

## Known RLS Gaps & Mitigations

### Gap 1: Shared Data View (shared_data)
**Issue**: The `shared_data` view grants access based on `partners` relationship and permissions.
**Verification**:
- [ ] shared_data only returns rows where user has an active partnership
- [ ] shared_data respects permission flags (share_mood, share_fertility, share_symptoms)
- [ ] shared_data policies enforce creator role restrictions (viewer vs trusted vs mutual)

### Gap 2: Edge Functions (smart_events, notifications)
**Issue**: Edge functions may need to bypass row-level filters to compute insights.
**Mitigation**:
- [ ] Always use service_role key only in edge functions (never in app)
- [ ] Edge functions MUST re-verify user authorization before returning data
- [ ] Log all service_role operations for audit trail
- [ ] No service_role key exists in app bundle

### Gap 3: Realtime & Subscriptions
**Issue**: Realtime subscriptions may leak presence to unauthorized users.
**Mitigation**:
- [ ] Realtime channels scoped to user_id or chat_id, never global
- [ ] Presence disabled for sensitive tables
- [ ] API tokens have 1-hour TTL (rotate before data-heavy operations)

---

## Audit Trail

**Last Audit Date**: [YYYY-MM-DD]
**Auditor**: [Security Team]
**Status**: ✅ PASS / ⚠️ NEEDS_REVIEW / ❌ FAIL

### Notable Issues Found:
- (None yet) or list any RLS bypasses discovered

---

## Next Steps

1. **Automated Testing**: Add RLS tests to CI/CD pipeline
   ```bash
   npm run test:rls  # Verify each policy with authenticated + unauthenticated context
   ```

2. **Monitoring**: Track unauthorized access attempts
   - PostgreSQL pgaudit extension for mutation logging
   - Supabase audit logs for API call patterns

3. **Rotation**: Review RLS policies quarterly or after schema changes

4. **Documentation**: Keep this checklist in sync with schema.sql

---
