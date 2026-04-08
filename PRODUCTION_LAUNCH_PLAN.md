# SOMA Production Launch Preparation - Detailed Plan

## Phase 1: Console Log Replacement ✅ COMPLETE

**Status**: DONE

**Files updated** (43 console calls replaced with structured logger):
1. src/services/OfflineQueueManager.ts - 21 calls ✅
2. src/services/errorTracking.tsx - 7 calls ✅
3. src/services/globalErrorHandlers.ts - 3 calls ✅
4. src/services/notificationService/* - 6 calls ✅
5. src/screens/HomeScreen.tsx - 2 calls ✅
6. src/components/ui/*.tsx - 3 calls ✅
7. src/store/useCycleStore.ts - 1 call ✅

**Logger Details**:
- Created: `src/platform/monitoring/logger.ts` (600+ lines)
- Initialized in: `app/_layout.tsx`
- Import for new code: `import { log, logError, logInfo } from '@/platform/monitoring/logger'`
- Fire-and-forget pattern: Never blocks UI
- Dev mode: Colored console output
- Prod mode: Async fire to Sentry/PostHog

---

## Phase 2: Domain Structure Migration

### Target Structure
```
src/domain/
├── auth/
│   ├── hooks/
│   │   ├── useAuth.ts (from lib/useAuth.ts)
│   │   └── index.ts (barrel export)
│   ├── adapters/
│   │   ├── authAdapter.ts (from platform/supabase/adapters/)
│   │   └── index.ts (barrel export)
│   ├── types.ts
│   └── index.ts (barrel export: hooks + adapters)
│
├── cycle/
│   ├── hooks/
│   │   ├── useCurrentCycle.ts (from hooks/)
│   │   ├── useCycleActions.ts (from hooks/)
│   │   ├── useCycleHistory.ts (from hooks/)
│   │   ├── usePeriodAutoEnd.ts (from hooks/)
│   │   └── index.ts (barrel export)
│   ├── services/
│   │   ├── predictions.ts (computation logic)
│   │   └── index.ts (barrel export)
│   ├── mappers/
│   │   ├── cycleMapper.ts (row → UI model)
│   │   └── index.ts
│   ├── types.ts
│   └── index.ts
│
├── calendar/
│   ├── hooks/
│   │   ├── useDailyLogs.ts (from hooks/)
│   │   ├── useCycleCalendar.ts (from hooks/)
│   │   └── index.ts
│   ├── derivations/
│   │   ├── computeCalendarMap.ts
│   │   └── index.ts
│   ├── types.ts
│   └── index.ts
│
├── logging/
│   ├── hooks/
│   │   ├── useRealtimeSync.ts (from hooks/)
│   │   └── index.ts
│   └── index.ts

src/platform/
├── supabase/
│   ├── client.ts (from lib/supabase.ts)
│   ├── adapters/
│   │   ├── authAdapter.ts
│   │   ├── cycleAdapter.ts
│   │   ├── profileAdapter.ts
│   │   └── index.ts (barrel export)
│   └── index.ts (barrel export)
│
├── monitoring/
│   ├── logger.ts ✅ Created
│   ├── errorTracking.ts (from src/services/)
│   ├── analytics.ts (from src/services/)
│   └── index.ts (barrel export all)

src/app/
├── bootstrap/
│   ├── AuthBootstrap.tsx
│   └── routing-guards.ts
├── _layout.tsx (main entry, uses bootstrap/)
└── index.tsx (redirect)
```

### Backward Compatibility Shims

For each moved file, create a re-export shim at the old location for 2 weeks:

```typescript
// hooks/useCurrentCycle.ts (DEPRECATED - shim for backward compatibility)
// Remove this after 2 weeks of migration (target date: 2026-04-21)
export * from '../src/domain/cycle/hooks/useCurrentCycle';

// lib/supabase.ts (DEPRECATED - shim)
export * from '../src/platform/supabase/client';

// lib/auth.ts (DEPRECATED - shim)
export * from '../src/domain/auth/adapters/authAdapter';
```

**Benefits**:
- Zero breaking changes during migration
- Incremental adoption (migrate imports at will)
- Old imports still work but type checkers can warn
- Easy rollback if issues arise

---

## Phase 3: Bundle Cleanup

### Task 3.1: Verify Mock Data Removal
**Files to verify**:
- ✅ src/utils/mockData.ts - already cleaned up in Phase 2 refactor
- ✅ src/domain/constants/logOptions.ts - created, mock data moved
- ✅ src/features/cycle/uiCycleData.ts - cleaned up

**Verification**:
```bash
npm run build  # or expo export --analyze for React Native
# Check that mockData imports don't appear in production chunk
grep -r "mockData" dist/ || echo "✓ No mock data in bundle"
```

### Task 3.2: Verify No Unused Dependencies
**Current unused**:
- ❓ server.js mock calendar endpoints (check if used by CI/tests)

**Verification**:
```bash
# Check if server.js is referenced anywhere
grep -r "server.js" . --exclude-dir=node_modules
```

### Task 3.3: Generate Bundle Baseline
```bash
npx expo export --analyze
# Output will show:
# - Total JS bundle size (baseline: should be recorded)
# - Largest modules (to monitor for regressions)
# - No mockData present
# - No server.js code present
```

**Expected baseline**: Monitor for future regressions

---

## Phase 4: App Store Readiness Checklist

### Security & Configuration
- [ ] No hardcoded API keys in JS bundle (only safe ANON_KEY)
- [ ] Privacy manifest (iOS PrivacyInfo.xcprivacy)
  - [ ] AsyncStorage usage listed
  - [ ] MMKV usage listed (if used)
  - [ ] Network usage listed
  - [ ] UserDefaults usage listed
- [ ] Android manifest (privacy, permissions)
  - [ ] INTERNET permission
  - [ ] VIBRATE permission (haptics)
  - [ ] RECEIVE_BOOT_COMPLETED (background tasks)

### App Functionality
- [ ] Error messages shown to users never expose raw exception strings
- [ ] All navigation routes have corresponding screens (no dead routes)
- [ ] Screen error boundaries catch React component errors
- [ ] Network timeout handling (UI shows "Connection lost" etc.)
- [ ] Offline functionality works (queue persists across app restart)

### Monitoring & Observability
- [ ] Crash-free session rate baseline measured (via Sentry)
- [ ] All unhandled errors logged (global error handler active)
- [ ] Startup performance baseline recorded (bootstrap_duration_ms)
- [ ] Structured logging active (logger.ts initialized)

### Compliance & Privacy
- [ ] Minor/child flows go through parental consent edge function
- [ ] HIPAA compliance checks passed (sensitive data encrypted in transit)
- [ ] Data deletion flow tested (GDPR right to be forgotten)
- [ ] Audit logs retained for sensitive operations

### Code Quality
- [ ] No console.log in production code (replaced with logger)
- [ ] No test-only code in production bundle
- [ ] No debug URLs or backdoors
- [ ] All images optimized (size, format)

### Performance
- [ ] Cold startup time < 1 second benchmark
- [ ] Calendar render time < 100ms for 2-year view
- [ ] Query cache hit rate > 80% after warm start
- [ ] Memory usage < 150MB on low-end devices

### Release Preparation
- [ ] Version bumped (e.g., 1.0.0)
- [ ] Changelog updated
- [ ] App Store description, screenshots, privacy policy updated
- [ ] TestFlight build created and tested by QA
- [ ] All critical paths tested manually:
  - [ ] Sign up flow
  - [ ] First cycle log
  - [ ] Calendar view
  - [ ] Offline mode switch
  - [ ] Settings/profile edit
  - [ ] Parental consent flow (if minor)

---

## Implementation Order

1. **Week 1**: Console log replacement (Phase 1) ✅
2. **Week 2**: Domain structure migration (Phase 2)
3. **Week 3**: Bundle cleanup & analysis (Phase 3)
4. **Week 4**: App Store readiness & final checks (Phase 4)

---

## Rollback Plan

If issues arise during migration:

1. **Console logs**: Revert to old console.* calls (no dependencies)
2. **Domain structure**: Keep shims indefinitely, gradually migrate imports
3. **Bundle**: Use git to revert to last known good build
4. **Monitoring**: Disable logger.ts if Sentry/PostHog integration broken

---

## Files Created/Modified

### New Files
- src/platform/monitoring/logger.ts ✅
- src/platform/monitoring/errorTracking.ts (new)
- src/platform/monitoring/analytics.ts (new)
- src/platform/monitoring/index.ts
- src/domain/auth/* (new domain structure)
- src/domain/cycle/* (new domain structure)
- src/domain/calendar/* (new domain structure)

### Modified Files
- app/_layout.tsx (add logger initialization)
- src/services/globalErrorHandlers.ts (use logger)
- src/services/OfflineQueueManager.ts (use logger)
- All 14 files with console.* calls

### Backward Compatibility Shims
- hooks/ (re-exports to domain/*/hooks/)
- lib/supabase.ts (re-export)
- lib/auth.ts (re-export)
- src/services/errorTracking.ts (re-export to platform/)
- src/services/analytics.ts (re-export to platform/)

---

**Last updated**: 2026-04-07
**Status**: In Progress - Phase 1 Logger ✅, Phase 1 Console Replacement (in progress)
