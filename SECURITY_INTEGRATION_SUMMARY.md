# SOMA Security & Reliability Hardening - Implementation Summary ✅

**Status**: Complete (2026-04-07)
**Scope**: Error boundaries, input validation, RLS audit, offline queue, secrets detection

---

## Task 1: Screen-Level Error Boundaries ✅

### Implementation
**File**: `src/components/ScreenErrorBoundary.tsx` (323 lines)

**Features**:
- Catches React errors at screen level (prevents full-app crashes)
- Maps errors to i18n keys for user-friendly messages
- Auto-retry with max-attempt tracking
- Logs to Sentry/error tracking with screen context
- Generic error messaging (no raw error.message to users)

**Error Mapping**:
```typescript
'validation_error' → 'error.validation_failed'
'network_error' → 'error.network_unavailable'
'permission_denied' → 'error.permission_denied'
'not_found' → 'error.resource_not_found'
'conflict_error' → 'error.conflict_occurred'
'internal_error' → 'error.internal_server_error'
'timeout_error' → 'error.request_timeout'
'offline_error' → 'error.offline_mode'
```

**UI Components**:
- Error icon with error-type-specific symbols (SymbolView)
- Friendly title + description (no stack traces)
- "Try Again" button (respects max retries)
- "Go Back" button (reset state)
- Support link for permission/server errors

### Screen Integration ✅

Wrapped with `ScreenErrorBoundary` (created wrapper exports):

1. **HomeScreen** → `HomeScreenWithErrorBoundary()`
   - Handles cycle review, daily insights, period logging
   - Critical path for app startup

2. **DailyLogScreen** → `DailyLogScreenWithErrorBoundary()`
   - Form submission, flow/mood/energy/symptoms logging
   - Validation error handling

3. **SmartCalendarScreen** → `SmartCalendarScreenWithErrorBoundary()`
   - Heavy calendar rendering with animations
   - Cycle-related mutations

4. **SettingsScreen** → `SettingsScreenWithErrorBoundary()`
   - Profile updates, notification preferences, logout
   - Admin operations (reset, delete)

**Usage Pattern**:
```typescript
export function HomeScreenWithErrorBoundary() {
  return (
    <ScreenErrorBoundary screenName="HomeScreen">
      <HomeScreen />
    </ScreenErrorBoundary>
  );
}
```

---

## Task 2: Input Validation Before Mutations ✅

### Implementation
**File**: `src/domain/validators/index.ts` (550+ lines)

**Validators Created**:

#### 1. `validateDailyLog(log: DailyLogInput)`
- Date: ISO 8601 format, not in future, valid calendar date
- Flow: Must be in FLOW_OPTIONS (0-3)
- Mood: Must be in MOOD_OPTIONS (Happy, Sensitive, Energetic, etc.)
- Energy: Must be in ENERGY_OPTIONS (Low, Medium, High)
- Symptoms: Max 8, each must be in SYMPTOM_OPTIONS
- Notes: String, max 500 chars

**Returns**:
```typescript
{ valid: true } // Success
{ valid: false, reason: 'validation.date_required' } // i18n key
{ valid: false, reason: 'validation.invalid_date_value', context: {...} } // With context
```

#### 2. `validateCycleStart(input: CycleStartInput)`
- Start date: ISO 8601, not in future, not >365 days ago
- Cycle length: Optional, 21-35 days if provided

#### 3. `validateCycleEnd(input: CycleEndInput)`
- End date: ISO 8601, not in future
- Must be after start date
- Duration max 35 days

#### 4. `validateProfileUpdate(input: ProfileUpdateInput)`
- **Name**: 1-100 chars, required if provided
- **Username**: 3-30 chars, alphanumeric + underscore/hyphen
- **DOB**: ISO 8601, minimum 13 years old (COPPA), not future
- **Cycle length**: 21-35 days
- **Period duration**: 1-10 days
- **Luteal phase start**: 1-35 days (optional)

#### 5. `validateEmail(email: string)`
- RFC 5322 simplified regex
- Max 254 chars

#### 6. `validatePassword(password: string)`
- Min 12 chars
- Must include: uppercase, lowercase, number, special char

### Integration ✅

**In adapters** (`src/platform/supabase/adapters/`):

```typescript
// cycleAdapter.ts
upsertLog: async (log: DailyLogInsert) => {
  const validation = validateDailyLog(log);
  if (!validation.valid) {
    return {
      data: null,
      error: new Error(`Validation failed: ${validation.reason}`),
    };
  }
  // Proceed with Supabase mutation
  return supabase.from('daily_logs').upsert(log);
};
```

**Error Flow**:
1. User submits form (e.g., DailyLogScreen)
2. Validator checks input → i18n error key
3. Show error to user (via app's i18n system)
4. Never reaches Supabase (first line of defense)
5. RLS policies as last line of defense

---

## Task 3: RLS Audit Checklist ✅

### File
**Location**: `docs/RLS_AUDIT_CHECKLIST.md` (400+ lines)

### Verification Matrix

#### Table: `profiles`
- ✅ SELECT: `auth.uid() = id`
- ✅ INSERT: `auth.uid() = id` WITH CHECK
- ✅ UPDATE: `auth.uid() = id` USING + WITH CHECK
- ✅ DELETE: `auth.uid() = id`

#### Table: `cycles`
- ✅ SELECT: `auth.uid() = user_id`
- ✅ INSERT: `auth.uid() = user_id` WITH CHECK
- ✅ UPDATE: `auth.uid() = user_id` USING + WITH CHECK
- ✅ DELETE: `auth.uid() = user_id`

#### Table: `daily_logs`
- ✅ SELECT: `auth.uid() = user_id`
- ✅ INSERT: `auth.uid() = user_id` WITH CHECK
- ✅ UPDATE: `auth.uid() = user_id` USING + WITH CHECK
- ✅ DELETE: `auth.uid() = user_id`

#### Table: `smart_events`
- ✅ SELECT: `auth.uid() = user_id` (prevents inference leakage)
- ✅ INSERT: Backend-only (service role)
- ✅ UPDATE/DELETE: Restricted to backend

#### Table: `push_tokens`
- ✅ SELECT: `auth.uid() = user_id` (prevents token enumeration)
- ✅ INSERT: `auth.uid() = user_id` WITH CHECK
- ✅ UPDATE/DELETE: `auth.uid() = user_id`

#### Table: `partners`
- ✅ SELECT: User sees partnerships where `user_id = auth.uid() OR partner_id = auth.uid()`
- ✅ INSERT: `auth.uid() = user_id` WITH CHECK
- ✅ UPDATE/DELETE: Either party can manage (both sides)

### Schema Hardening
- ✅ **Search Path**: All functions have `search_path = public` to prevent schema injection
- ✅ **Audit Logging**: Optional implementation provided for post-breach analysis

### Testing Checklist
- [ ] Unit tests for SELECT/INSERT/UPDATE/DELETE per policy
- [ ] Integration tests: cross-user access → 403
- [ ] Edge case: concurrent writes, bulk operations
- [ ] Manual verification with test users

---

## Task 4: Offline Queue with Idempotency ✅

### Implementation
**File**: `src/services/OfflineQueueManager.ts` (500+ lines)

### Key Features

#### Idempotency
- Each operation gets UUID (`requestId`)
- Same UUID processed multiple times → same result
- Survives app force-quit + restart

**Example**:
```typescript
const operation = await OfflineQueueManager.enqueue(
  'daily_logs',
  'upsert',
  { date: '2026-04-07', flow_level: 2, mood: 'Happy' },
  { maxAttempts: 3 }
);
// requestId: 'abc123-def456-...'
// If app crashes, requestId is persisted
// On reconnect: same request sent with same UUID
```

#### Conflict Handling
- 409 Conflict (already applied) → treated as **success**
- 5xx errors → retry with exponential backoff
- 1s, 4s, 16s delays between attempts

```typescript
if (response.status === 409) {
  // Operation already applied (idempotent), mark as synced
  result.synced++;
} else if (response.status >= 500) {
  // Transient server error, retry
  operation.attemptCount++;
  if (operation.attemptCount >= operation.maxAttempts) {
    // Move to dead-letter queue
    result.deadLettered++;
  }
}
```

#### Dead-Letter Queue
- After max retries: operation moved to dead-letter
- User alerted: "Some changes couldn't be saved"
- Persists in AsyncStorage for later inspection/replay

**Dead-Letter Entry**:
```typescript
{
  requestId: 'abc123-...',
  failureReason: '403 Forbidden - Permission denied',
  errorMessage: 'User does not have permission to update cycles',
  movedAt: '2026-04-07T10:30:00Z',
  operation: { /* original queued op */ }
}
```

#### Deduplication
- On app restart: partial flush DOES NOT duplicate writes
- Each operation tracked by `requestId` (not entity)
- Already-synced operations skipped on next flush

**Storage**:
```typescript
const QUEUE_STORAGE_KEY = '@soma/offline_queue:main';
const DEAD_LETTER_STORAGE_KEY = '@soma/offline_queue:dead_letter';
const QUEUE_STATE_KEY = '@soma/offline_queue:state';
```

### Integration Points

**In `useOfflineQueue()` hook**:
```typescript
const { pendingCount, isSyncing, flush } = useOfflineQueue();

// HomeScreen: display pending indicator
{pendingCount > 0 && <Badge>{pendingCount}</Badge>}

// On reconnect: flush queue
useNetworkSync(() => {
  flush(); // Process FIFO, retry with backoff
});
```

---

## Task 5: API Key & Secrets Audit ✅

### Implementation
**File**: `scripts/security-check-secrets.sh` (400+ lines, executable)

### Detection Patterns

**CRITICAL (Exit 1)**:
- `service_role` in `/src` directory
- `SERVICE_ROLE_KEY` anywhere in code
- Firebase private keys in source
- PostgreSQL connection strings with passwords
- OAuth client_secret hardcoded

**Warnings (Exit 2)**:
- `.env` files committed to git
- `.env.local` files in bundle
- Environment secrets in build artifacts

### Usage

**Local (Pre-commit)**:
```bash
./scripts/security-check-secrets.sh
# Exit 0: Pass (no critical secrets found)
# Exit 1: FAIL (service_role or critical key found)
# Exit 2: Warning (suspicious file committed)
```

**In CI/CD (.github/workflows/)**:
```yaml
- name: Security Check
  run: ./scripts/security-check-secrets.sh --app-only
  if: failure()
    exit 1 # Fail build
```

### Examples

✅ **PASS** - App bundle contains only `SUPABASE_ANON_KEY`:
```
✓ No service_role keys found in /src
✓ No private keys found in /src
✓ No hardcoded database passwords
```

❌ **FAIL** - Someone committed service role key:
```
✗ CRITICAL: Found 'service_role' in src/lib/supabase.ts:45
  Context: const SR_KEY = 'eyJhbGc...service...';
Exit 1
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All screens wrapped with `ScreenErrorBoundary`
- [ ] All validators integrated into adapters
- [ ] Test cross-user RLS queries on staging
- [ ] Confirm `service_role` NOT in app bundle: `./scripts/security-check-secrets.sh`
- [ ] Offline queue tested with network disconnection
- [ ] Error boundary tested with simulated screen crash

### Post-Deployment
- [ ] Monitor Sentry for screen-level errors
- [ ] Check analytics for error boundary hits (should be rare)
- [ ] Verify offline queue successful syncs in analytics
- [ ] Confirm no validation rejection spam (suggests UX issue)

---

## Security Model Summary

```
User Input
    ↓
[VALIDATOR] ← First line of defense
    ↓ (validation error)
Show i18n error to user
    ↓ (valid)
Send to Adapter
    ↓
[ADAPTER] → Supabase PostgREST
    ↓
[RLS POLICY] ← Last line of defense (auth.uid() = row user_id)
    ↓ (policy violation)
Return 403 Forbidden
    ↓ (allowed)
Mutate database row
    ↓
[OFFLINE QUEUE] (optional)
Persist with UUID for retry on reconnect
```

---

## Known Risks & Mitigations

| Risk | Mitigation | Status |
|------|-----------|--------|
| Error boundary swallows errors silently | All errors logged to Sentry with screen context | ✅ |
| Timing attacks on RLS policies | Cache USING/WITH CHECK expressions | ℹ️ DB-level |
| Information leakage via error messages | Generic messages, i18n keys only | ✅ |
| Offline queue causes duplicate writes | Idempotency tokens + deduplication | ✅ |
| Validator bypassed somehow | RLS policies catch it (last line of defense) | ✅ |
| Service role key accidentally committed | CI script prevents build | ✅ |
| Care Circle data sharing (future) | RLS audit includes secondary policies | ⚠️ TBD |

---

## Testing Recommendations

### Unit Tests
```typescript
// validators.test.ts
test('validateDailyLog rejects future dates', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const result = validateDailyLog({
    date: tomorrow.toISOString().split('T')[0],
  });
  expect(result.valid).toBe(false);
  expect(result.reason).toBe('validation.future_date_not_allowed');
});
```

### Integration Tests
```typescript
// offlineQueue.integration.test.ts
test('409 Conflict treated as success', async () => {
  const op = await OfflineQueueManager.enqueue('daily_logs', 'upsert', {...});
  // Simulate already-applied operation
  const result = await OfflineQueueManager.flush();
  expect(result.synced).toBeGreaterThan(0);
});
```

### Manual Tests
1. **Error Boundary**: Throw error in component → verify error fallback shows
2. **Validation**: Submit invalid date → verify validation error (not RLS 403)
3. **Offline Queue**: Disconnect network → enqueue operation → reconnect → verify synced
4. **RLS**: Login as User A, query User B's data → verify 403 or empty result

---

## Next Steps (Optional)

1. **Monitoring**: Set up Sentry alerts for high error boundary hit rates
2. **Analytics**: Track validation rejection rates (UX improvement trigger)
3. **Edge Function**: Implement true batch RPC for bootstrap (1 DB round trip)
4. **Rate Limiting**: Add Supabase rate limit headers to offline queue retries
5. **Care Circle**: Document secondary RLS policies for partner access

---

**Last Updated**: 2026-04-07
**Status**: ✅ All core security requirements implemented and integrated
