# SOMA Production Launch - Quick Reference Card

## Logger Imports & Usage

### Import the logger
```typescript
import {
  log,
  logDebug,
  logInfo,
  logWarn,
  logError,
  logDataEvent,
  logAuthEvent,
  logPerformance,
  logValidationError,
  logUnhandledError,
  initializeMonitoring,
  setMonitoringUserId,
} from '@/platform/monitoring/logger';
```

### Common patterns
```typescript
// Info event
logInfo('auth', 'sign_in', { userId: '123', method: 'email' });

// Error event
logError('error', 'network_timeout', { url: '/api/cycles', ms: 5000 });

// Data sync event
logDataEvent('offline_queue_flush', { synced: 5, failed: 0 });

// Performance event
logPerformance('bootstrap_duration_ms', 523, { step: 'hydration' });

// Auth event
logAuthEvent('session_restored', { anon: false });

// Validation error
logValidationError('Invalid cycle start date', { provided: '2026-13-01' });

// Unhandled exception
logUnhandledError(error, { context: 'homescreen_render' });
```

### After user login
```typescript
import { setMonitoringUserId } from '@/platform/monitoring/logger';

// Call after successful auth
setMonitoringUserId(user.id);
// Now all logs include userId in context
```

---

## Domain Imports (New Structure)

### Auth domain
```typescript
// Old (still works until 2026-04-21)
import { useAuth, useProfile } from '@/hooks/useProfile';
import { authAdapter } from '@/src/platform/supabase/adapters/authAdapter';

// New (preferred)
import { useAuth, useProfile } from '@/domain/auth';
import { authAdapter, profileAdapter } from '@/domain/auth';
```

### Cycle domain
```typescript
// Old (still works)
import { useCurrentCycle } from '@/hooks/useCurrentCycle';
import { useCycleActions } from '@/hooks/useCycleActions';
import { useCycleHistory } from '@/hooks/useCycleHistory';
import { usePeriodAutoEnd } from '@/hooks/usePeriodAutoEnd';

// New (preferred)
import {
  useCurrentCycle,
  useCycleActions,
  useCycleHistory,
  usePeriodAutoEnd,
} from '@/domain/cycle';
```

### Calendar domain
```typescript
// Old (still works)
import { useDailyLogs, useDailyLogsByDateRange } from '@/hooks/useDailyLogs';
import { useCycleCalendar } from '@/hooks/useCycleCalendar';

// New (preferred)
import {
  useDailyLogs,
  useDailyLogsByDateRange,
  useCycleCalendar,
} from '@/domain/calendar';
```

### Logging domain
```typescript
// Old (still works)
import { useNetworkSync } from '@/hooks/useNetworkSync';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

// New (preferred)
import { useNetworkSync, useRealtimeSync } from '@/domain/logging';
```

---

## File Locations Reference

### Monitoring & Logger
- `src/platform/monitoring/logger.ts` - Main logger implementation
- `src/platform/monitoring/index.ts` - Barrel export
- **Initialize in**: `app/_layout.tsx` (already done)

### Domain Structure (New)
```
src/domain/
├── auth/
│   ├── hooks/ → useAuth, useProfile
│   ├── adapters/ → authAdapter, profileAdapter
│   └── index.ts
├── cycle/
│   ├── hooks/ → useCurrentCycle, useCycleActions, etc.
│   └── index.ts
├── calendar/
│   ├── hooks/ → useDailyLogs, useCycleCalendar
│   └── index.ts
└── logging/
    ├── hooks/ → useNetworkSync, useRealtimeSync
    └── index.ts
```

### Backward Compatibility Shims (Remove by 2026-04-21)
- `hooks/useCurrentCycle.ts`
- `hooks/useCycleActions.ts`
- `hooks/useCycleHistory.ts`
- `hooks/usePeriodAutoEnd.ts`
- `hooks/useDailyLogs.ts`
- `hooks/useCycleCalendar.ts`
- `hooks/useNetworkSync.ts`
- `hooks/useRealtimeSync.ts`
- `lib/useAuth.ts`
- `hooks/useProfile.ts`

---

## Mandatory Logging Events

### Auth Events
```typescript
logAuthEvent('storage_selected', { method: 'AsyncStorage' });
logAuthEvent('session_restored', { userId: '123' });
logAuthEvent('bootstrap_routed', { route: '/(tabs)' });
logAuthEvent('sign_in', { email: 'user@example.com' });
logAuthEvent('sign_out', { userId: '123' });
```

### Data Events
```typescript
logDataEvent('bootstrap_rpc_success', { profile: true, cycle: true });
logDataEvent('bootstrap_rpc_fail', { error: 'timeout' });
logDataEvent('query_cache_hit', { queryKey: 'profile', age_ms: 1523 });
logDataEvent('offline_queue_flush', { synced: 5, failed: 0 });
```

### Performance Events
```typescript
logPerformance('bootstrap_duration_ms', 523);
logPerformance('calendar_render_ms', 87);
```

### Error Events
```typescript
logError('error', 'unhandled_exception', { message: '...', stack: '...' });
logError('error', 'rls_denied', { table: 'cycles', operation: 'select' });
logError('error', 'network_timeout', { url: '/api/user', ms: 5000 });
```

---

## Documentation Files

### For the whole team
- **`PRODUCTION_READINESS_SUMMARY.md`** - This summary (you're reading it!)
- **`PRODUCTION_LAUNCH_PLAN.md`** - Detailed phase-by-phase plan
- **`BUNDLE_ANALYSIS_REPORT.md`** - Bundle metrics, performance, security
- **`APP_STORE_READINESS_CHECKLIST.md`** - 800+ line comprehensive checklist

### For developers
- `src/platform/monitoring/logger.ts` - Logger implementation with doc comments
- Code files with logger usage (search for `logInfo`, `logError`)

### For QA
- `APP_STORE_READINESS_CHECKLIST.md` - Section "Manual Testing Checklist"

### For DevOps/Release
- `APP_STORE_READINESS_CHECKLIST.md` - Sections "Release Process" and "App Store Submission"

---

## Timeline & Deadlines

| Date | Milestone | Owner |
|------|-----------|-------|
| 2026-04-21 | Remove backward compatibility shims | Dev Team |
| 2026-04-21 | TestFlight submission | Release Lead |
| 2026-05-05 | App Store submission | Release Lead |
| 2026-05-12 | Public launch (pending feedback) | Product Manager |

---

## Troubleshooting

### Q: Logger not appearing in console
A: Check that you're running in dev mode (`expo start`). In production, logs go to Sentry/PostHog.

### Q: Old imports causing type errors
A: They should still work via shims until 2026-04-21. If not, check that shim file exists in hooks/ or lib/

### Q: Bundle size increased after migration
A: Expected. New domain structure adds ~80 KB of infrastructure but enables future optimizations.

### Q: Performance worse after changes
A: Profile with React Profiler. Logger is fire-and-forget (<1ms). Domain structure is compile-time only.

### Q: Monitoring not sending to Sentry
A: Check environment variables:
  - `EXPO_PUBLIC_SENTRY_DSN` - Must be set for Sentry to initialize
  - `EXPO_PUBLIC_POSTHOG_API_KEY` - For PostHog analytics

---

## Verification Commands

```bash
# Check logger initialization
grep -r "initializeMonitoring()" app/

# Search for remaining console calls (should be 0)
grep -rn "console\." src/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# Verify domain structure exists
ls -R src/domain/

# Check backward compatibility shims
ls -1 hooks/ | grep -E "use(Current|Cycle|Daily|Network|Realtime|Profile|Period|Period)"

# Run bundle analysis
npx expo export --analyze
```

---

**Quick Start**: Import from domain structure instead of hooks/:
```typescript
// ✅ DO
import { useCurrentCycle } from '@/domain/cycle';

// ❌ (works for now, but deprecated)
import { useCurrentCycle } from '@/hooks/useCurrentCycle';
```

---

**Questions?** Refer to the full docs in PRODUCTION_READINESS_SUMMARY.md or inline code comments.
