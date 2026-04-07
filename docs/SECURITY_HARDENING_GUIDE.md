/**
 * docs/SECURITY_HARDENING_GUIDE.md
 *
 * Comprehensive guide to implementing the security hardening improvements
 * for SOMA React Native health app.
 *
 * Topics covered:
 * 1. Screen-level error boundaries
 * 2. Input validation
 * 3. Offline queue with idempotency
 * 4. RLS verification
 * 5. Secrets management
 */

# 🔒 Security Hardening Implementation Guide

## Overview

This guide documents the security improvements implemented for SOMA, organized by implementation area. Each section includes code examples and verification steps.

---

## 1. Screen-Level Error Boundaries

### What It Does
- Catches React rendering errors scoped to individual screens
- Prevents full-app crashes from single-screen issues
- Shows user-friendly fallback UI without exposing error messages
- Logs errors to Sentry with screen context

### Where It's Located
- **Component**: `src/components/ScreenErrorBoundary.tsx`
- **Global Boundary**: `src/components/ui/SomaErrorBoundary.tsx`

### How to Use

#### In a Screen Component:
```tsx
import { ScreenErrorBoundary } from '@/src/components/ScreenErrorBoundary';

export function MyScreen() {
  return (
    <ScreenErrorBoundary screenName="MyScreen">
      <View>
        {/* Screen content */}
      </View>
    </ScreenErrorBoundary>
  );
}
```

#### Configuration Options:
```tsx
<ScreenErrorBoundary
  screenName="DailyLogScreen"        // Used in error logs
  maxRetries={3}                      // Auto-retry attempts
  onError={(error, info) => {
    console.log('Custom error handler', error);
  }}
>
  {/* Screen content */}
</ScreenErrorBoundary>
```

### Integration Checklist
- [ ] Add `<ScreenErrorBoundary>` wrapper to each screen
- [ ] Test by importing a non-existent component in a screen
- [ ] Verify error fallback UI appears
- [ ] Check Sentry logs for the error with screen context
- [ ] Test retry button functionality

### Example: DailyLogScreen Integration
```tsx
// src/screens/DailyLogScreen.tsx
import { ScreenErrorBoundary } from '@/src/components/ScreenErrorBoundary';

export default function DailyLogScreen() {
  return (
    <ScreenErrorBoundary screenName="DailyLogScreen">
      <SafeAreaView style={styles.container}>
        {/* Existing screen content */}
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
}
```

### Error Categorization
The component automatically categorizes errors into i18n-ready keys:
- `validation_error` → 'error.validation_failed'
- `network_error` → 'error.network_unavailable'
- `permission_denied` → 'error.permission_denied'
- `offline_error` → 'error.offline_mode'

To add a custom i18n message, update the ERROR_MESSAGE_MAP in the component.

---

## 2. Input Validation

### What It Does
- Validates all write operations before sending to Supabase
- Returns i18n-ready error keys instead of raw messages
- Prevents database-level constraint violations
- Catches user input errors early

### Where It's Located
- **Validators**: `src/domain/validators/index.ts`
- **Usage**: Adapters call validators before mutations

### Validators Provided

#### Daily Log Validator
```tsx
import { validateDailyLog } from '@/src/domain/validators';

const validation = validateDailyLog({
  user_id: userId,
  date: '2026-04-07',
  flow_level: 2,
  mood: 'Happy',
  energy_level: 'High',
});

if (!validation.valid) {
  console.error(validation.reason);  // e.g., 'validation.daily_log_invalid'
  console.error(validation.details); // { flow_level: 'validation.invalid_flow_level' }
}
```

**Checks**:
- ✅ Date format (YYYY-MM-DD)
- ✅ Date not in future
- ✅ Flow level in allowed range (0-3)
- ✅ Mood from MOOD_OPTIONS
- ✅ Energy level from ENERGY_OPTIONS
- ✅ Symptoms are valid SymptomOptions
- ✅ Notes max 1000 characters

#### Cycle Start Validator
```tsx
import { validateCycleStart } from '@/src/domain/validators';

const validation = validateCycleStart({
  user_id: userId,
  start_date: '2026-04-07',
});

if (validation.valid) {
  // Safe to call adapter
  const result = await cycleAdapter.startCycle(validation.value);
}
```

#### Profile Update Validator
```tsx
import { validateProfileUpdate } from '@/src/domain/validators';

const validation = validateProfileUpdate({
  id: userId,
  first_name: 'Jane',
  cycle_length_average: 30,
  period_duration_average: 5,
});

if (!validation.valid) {
  return { error: validation.reason }; // Return to user
}
```

**Checks**:
- ✅ Name trimmed and < 100 chars
- ✅ Username alphanumeric + underscore (3-20 chars)
- ✅ Date of birth reasonable age (13-120 years)
- ✅ Cycle length in range 15-60 days
- ✅ Period duration in range 1-15 days

#### Auth Validators
```tsx
import { validateEmail, validatePassword } from '@/src/domain/validators';

// Email
const emailValidation = validateEmail('user@example.com');
if (!emailValidation.valid) {
  console.error(emailValidation.reason); // 'validation.email_invalid_format'
}

// Password (min 8 chars, uppercase, lowercase, digit)
const pwValidation = validatePassword('SecurePass123');
if (!pwValidation.valid) {
  console.error(pwValidation.reason); // 'validation.password_too_short'
}
```

### How to Use in Hooks/Components

#### Example: Using with useEffect
```tsx
import { useMutation } from '@tanstack/react-query';
import { validateDailyLog } from '@/src/domain/validators';
import { cycleAdapter } from '@/src/platform/supabase/adapters/cycleAdapter';

export function useDailyLogMutation() {
  return useMutation({
    mutationFn: async (log: DailyLogInsert) => {
      // Validate first
      const validation = validateDailyLog(log);
      if (!validation.valid) {
        // Return error with i18n key for UI to translate
        throw new Error(validation.reason);
      }

      // Then call adapter (adapter also validates, this is redundant but safe)
      const result = await cycleAdapter.upsertLog(log);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}
```

#### Example: Using in a Screen
```tsx
export function DailyLogScreen() {
  const [flowLevel, setFlowLevel] = useState<FlowLevel>(1);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    // Validate synchronously before any API call
    const validation = validateDailyLog({
      user_id: userId,
      date: todayUtc,
      flow_level: flowLevel,
    });

    if (!validation.valid) {
      // Show validation error to user (use i18n.t(validation.reason))
      setError(validation.reason || 'validation.unknown_error');
      return;
    }

    // Safe to save
    const result = await cycleAdapter.upsertLog({
      user_id: userId,
      date: todayUtc,
      flow_level: flowLevel,
    });

    if (result.error) {
      setError('error.save_failed');
    }
  };

  return (
    <View>
      {error && <ErrorAlert message={error} />}
      {/* Form UI */}
    </View>
  );
}
```

### Integration Checklist
- [ ] Import `validateXXX` functions where needed
- [ ] Call validator before calling adapter
- [ ] Handle validation errors with i18n lookup
- [ ] Test each validator with invalid inputs
- [ ] Add custom validators for domain-specific rules
- [ ] Update validators when schema changes

---

## 3. Offline Queue with Idempotency

### What It Does
- Queues mutations when offline
- Resumes sync when network restored
- Ensures no duplicate writes (idempotent via UUIDs)
- Moves failed operations to dead-letter queue
- Never silently discards write attempts

### Where It's Located
- **Manager**: `src/services/OfflineQueueManager.ts`
- **Usage Hook**: `hooks/useNetworkSync.ts`

### Architecture

```
┌─ Operation Enqueued ─┐
│ requestId = UUID    │
│ attemptCount = 0    │
└─────────┬───────────┘
         │
    ┌────▼─── Connected? ──── NO ──┐
    │             ▲                 │
    │            YES          Queue in AsyncStorage
    │             │                 │
    ├─ Retry Loop                   │
    │  Attempt 1 (0s delay)         │
    │  Attempt 2 (1s delay)         │
    │  Attempt 3 (4s delay)         │
    │  Attempt 4 (16s delay)        │
    │             │                 │
    │      ┌──────▼──────┐          │
    │      │   Success?  │          │
    │      └──────┬──────┘          │
    │            YES/NO             │
    │             │                 │
    │      ┌──────▼──────────┐      │
    │      │ 409 Conflict?   │      │
    │      │ (Already sent)  │      │
    │      └──────┬──────────┘      │
    │            YES/NO             │
    │             │                 │
    │      ┌──────▼──────────┐      │
    │      │ Max Retries?    │      │
    │      └──────┬──────────┘      │
    │            YES/NO             │
    │             │                 │
    │          ┌──┴──┐              │
    │        YES   NO               │
    │         │     └─ Retry Later  │
    │         │                     │
    │      ┌──▼──────────────┐      │
    │      │ Dead-Letter     │      │
    │      │ Queue           │      │
    │      └─────────────────┘      │
    │             │                 │
    └─────────────┴─────────────────┘
```

### Usage

#### Enqueue an Operation
```tsx
import { OfflineQueueManager } from '@/src/services/OfflineQueueManager';

async function saveDailyLog(log: DailyLogInsert) {
  // Check if online
  const isOnline = await canSync();

  if (!isOnline) {
    // Enqueue for later sync
    const requestId = await OfflineQueueManager.enqueue(
      'daily_logs',           // Table
      'upsert',               // Operation type
      log,                    // Payload
      {
        rowId: `${log.user_id}:${log.date}`, // For tracking
        maxAttempts: 3,       // Retry limit
      },
    );
    console.log('Queued operation:', requestId);
    return { queued: true, requestId };
  }

  // Online: sync immediately
  return await cycleAdapter.upsertLog(log);
}
```

#### Flush the Queue
```tsx
import { OfflineQueueManager } from '@/src/services/OfflineQueueManager';
import { cycleAdapter } from '@/src/platform/supabase/adapters/cycleAdapter';

async function syncOfflineQueue() {
  const result = await OfflineQueueManager.flushQueue(async (op) => {
    try {
      let response;

      if (op.table === 'daily_logs') {
        response = await cycleAdapter.upsertLog(op.payload as DailyLogInsert);
      } else if (op.table === 'profiles') {
        response = await profileAdapter.upsert(op.payload as ProfileUpdate & { id: string });
      }

      return {
        ok: !response.error,
        error: response.error?.message,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  });

  console.log('Sync result:', {
    synced: result.synced,
    failed: result.failed,
    deadLettered: result.deadLettered,
  });

  // Show user message if dead-letter entries exist
  if (result.deadLettered > 0) {
    Toast.show({
      type: 'warning',
      text1: 'Some changes could not be saved',
      text2: 'We\'ll retry when connection improves',
    });
  }
}
```

#### Monitor Dead-Letter Queue
```tsx
async function showFailedChanges() {
  const deadLetter = await OfflineQueueManager.getDeadLetterQueue();

  if (deadLetter.length === 0) {
    alert('All changes saved!');
    return;
  }

  alert(`${deadLetter.length} changes failed to save. Contact support.`);

  // Optional: Allow retry
  for (const entry of deadLetter) {
    console.log(`Failed: ${entry.operation.table}:${entry.requestId}`);
    console.log(`Reason: ${entry.errorMessage}`);
  }
}
```

#### Replay a Dead-Letter Entry
```tsx
async function retryFailedOperation(requestId: string) {
  try {
    await OfflineQueueManager.replayDeadLetter(requestId);
    console.log('Replayed operation, will sync on next flush');
  } catch (err) {
    console.error('Failed to replay:', err);
  }
}
```

### Integration with useNetworkSync

The `useNetworkSync()` hook automatically:
1. Monitors network state
2. Calls `OfflineQueueManager.flushQueue()` on reconnect
3. Handles backoff automatically

Already integrated in `AuthBootstrap` (app/_layout.tsx):
```tsx
useNetworkSync();  // Called once at app root
```

### Integration Checklist
- [ ] Replace direct `cycleAdapter.upsertLog()` calls with offline-aware wrapper
- [ ] Wrap mutations in `isOnline ? syncImmediately : enqueue` logic
- [ ] Call `flushQueue()` when network reconnects
- [ ] Show user toast/alert if dead-letter queue has entries
- [ ] Test by:
  - Save a log offline
  - Kill network
  - Restart app
  - Restore network → verify sync
- [ ] Test dead-letter: offline save → fail → go back online → show alert

---

## 4. RLS (Row-Level Security) Verification

### What It Does
- Database-level access control at row granularity
- Prevents unauthorized reads AND writes
- Cannot be bypassed by app code (enforced by Postgres)
- Last line of defense after input validation

### Where It's Located
- **Checklist**: `docs/RLS_AUDIT_CHECKLIST.md`
- **Database**: Supabase schema policies (not in this repo)

### Manual Verification Steps

#### 1. Check Profile Isolation
```sql
-- As authenticated user with UUID = 'user-123'
SELECT id, first_name FROM profiles WHERE id = auth.uid();
-- ✅ Should return own profile

SELECT id FROM profiles WHERE id != auth.uid();
-- ✅ Should return 0 rows (RLS blocks it)
```

#### 2. Check Daily Logs Isolation
```sql
-- As user-123
SELECT * FROM daily_logs WHERE user_id = auth.uid() AND date = '2026-04-07';
-- ✅ Should return own logs

SELECT * FROM daily_logs WHERE user_id = 'other-user-id';
-- ❌ Should fail with "new row violates row-level security policy"
```

#### 3. Check Partnership Visibility (both sides see the link)
```sql
-- As Alice (user-alice)
SELECT * FROM partners WHERE user_id = 'alice' AND partner_user_id = 'bob';
-- ✅ Should see if she initiated

-- As Bob (user-bob)
-- Should also be able to read the same row
SELECT * FROM partners WHERE user_id = 'alice' AND partner_user_id = 'bob';
-- ✅ Bob can see because of "user_id OR partner_user_id" check
```

### Service Role vs Anon Key
- **Anon key**: Used in app bundle, subject to RLS policies
- **Service role key**: Used ONLY in edge functions, bypasses RLS

⚠️ **CRITICAL**: If service_role key appears in `src/*`, this is a security breach.

Run the security check:
```bash
./scripts/security-check-secrets.sh --app-only
```

### Testing RLS Before Deployment

```bash
# If you have a test harness:
npm run test:rls

# Manual test via Supabase dashboard:
# 1. Go to SQL Editor
# 2. Create test users
# 3. Issue queries as each user
# 4. Verify isolation
```

---

## 5. Secrets Management

### What It Does
- Prevents accidental exposure of API keys and credentials
- Detects suspicious patterns in codebase
- Ensures .env files are not committed

### Where It's Located
- **Script**: `scripts/security-check-secrets.sh`

### How to Run

#### Before Committing
```bash
./scripts/security-check-secrets.sh
```

#### In CI Pipeline (GitHub Actions)
```yaml
- name: Security Check
  run: ./scripts/security-check-secrets.sh
```

#### Quick App-Only Check
```bash
./scripts/security-check-secrets.sh --app-only
```

### What It Checks
- ✅ No `service_role` keys in app source
- ✅ No private keys or certificates
- ✅ No AWS/GCP credentials
- ✅ `.env` files not tracked in git
- ✅ No suspicious patterns in build artifacts
- ✅ No hardcoded OAuth secrets

### Environment File Security

**Must include in `.gitignore`**:
```gitignore
.env.local
.env.*.local
.env.production.local
!.env.example
```

**Safe to commit** (no real values):
```
.env.example        ✅ Template only
.env.production.example  ✅ Template only
```

**Never commit**:
```
.env.local          ❌ Has real dev keys
.env.production     ❌ Has real prod keys
firebase-key.json   ❌ Service account
```

### Credential Rotation Procedure

If credentials are leaked:

1. **Immediate**:
   ```bash
   # Revoke the key in Supabase Dashboard
   # Generate a new anon key
   ```

2. **Update App**:
   ```bash
   # Update app/.env.local with new key
   # Rebuild and redeploy
   ```

3. **Audit**:
   ```bash
   # Check Supabase audit logs for unauthorized access
   # Review git history: git log --all -S "old_key"
   ```

4. **Document**:
   ```bash
   # Add to INCIDENT_LOG.md with timeline and remediation
   ```

### Integration Checklist
- [ ] Add security check to pre-commit hook
- [ ] Add security check to CI pipeline
- [ ] Verify `.env.local` is in `.gitignore`
- [ ] Review `.env.example` for realistic placeholders
- [ ] Set up credential rotation process
- [ ] Document secret rotation for team

---

## Summary Checklist

### Before Merge
- [ ] Error boundaries wrapped around screens
- [ ] All mutations validated before calling adapters
- [ ] Offline queue enabled for resilience
- [ ] RLS policies verified on database
- [ ] Security check passes (no secrets exposed)
- [ ] Documentation reviewed and updated

### Testing
- [ ] Test error boundary by throwing an error in a screen
- [ ] Test validators with invalid inputs
- [ ] Test OfflineQueueManager by simulating network loss
- [ ] Test RLS by querying as different users
- [ ] Test security check by intentionally adding a "secret"

### Monitoring (Post-Deploy)
- [ ] Check Sentry for screen-level errors
- [ ] Monitor dead-letter queue growth
- [ ] Audit RLS policy hits in Supabase logs
- [ ] Review failed validations (may indicate UX issues)

---

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Offline-First Architecture](https://offlinefirst.org/)

---

**Last Updated**: 2026-04-07
**Maintained By**: Security Team
