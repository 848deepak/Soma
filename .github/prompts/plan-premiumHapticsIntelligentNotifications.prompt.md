## Plan: Premium Haptics + Intelligent Notifications

Implement a centralized haptics layer on mobile plus an FCM-backed notification engine on Supabase (Edge Functions + pg_cron), while preserving the existing Expo Router + React Query + Supabase architecture. Start with low-risk refactors (service extraction and call-site migration), then add behavioral rules, reliability controls, analytics, and tests.

**Steps**
1. Phase 0 - Baseline validation and guardrails
1. Confirm current interaction + scheduling baselines in `src/screens`, `src/components/ui`, and `src/services/notificationService` and lock event naming conventions from analytics service.
1. Add feature flags in remote config for: `haptics_v2_enabled`, `push_fcm_enabled`, `behavioral_notifications_enabled`, `notifications_frequency_cap` to allow gradual rollout.
1. Decide push provider: use direct FCM HTTP v1 (recommended) with Supabase Edge Functions and retain local daily reminders as fallback.  

1. Phase 1 - Centralized Haptics Foundation (*blocks phase 2 haptics rollout*)
1. Create `src/services/haptics/HapticsService.ts` with a strict API: `selection()`, `impactLight()`, `impactMedium()`, `success()`, `error()`, `gestureTick()`, `phaseAwareFeedback(phase, action)`.
1. Add platform + capability guards, rate limiting/throttling for rapid gesture events, and safe no-throw wrappers.
1. Add analytics hooks inside service for optional tracking (`haptic_triggered`) behind config gate.
1. Add test mock support parity with `__mocks__/expo-haptics.ts` and create unit tests for service behavior/fallback paths.

1. Phase 2 - Haptics Integration Across User Journeys (*parallelizable by screen after step 6*)
1. Replace direct `expo-haptics` usage in `src/components/ui/Button.tsx`, `src/screens/DailyLogScreen.tsx`, and `src/screens/QuickCheckinScreen.tsx` with `HapticsService`.
1. Wire high-frequency interaction points: calendar day taps/month nav, period logging form submit, symptom toggles, auth/setup/setting form submissions, partner linking actions.
1. Add explicit confirmation/error haptics at mutation boundaries (success/error branches) and alert-confirm actions; avoid duplicating feedback on both wrapper and screen handler.
1. Add gesture-based haptics in swipe/scroll contexts (minimal cadence) and context-aware cycle-phase haptics where cycle phase already exists (no extra DB reads).
1. Validate no-overuse via per-screen interaction budget and disable on unsupported platforms.

1. Phase 3 - Notification Data Model + Backend Pipeline (*blocks phase 4 and 5*)
1. Add Supabase schema migration files for:
1. `push_tokens` (user_id, token, platform/device, app_version, timezone, last_seen, revoked_at)
1. `notification_preferences` (per-channel toggles, quiet hours, max/day)
1. `scheduled_notifications` (type, payload, scheduled_for_utc, timezone, status, retry_count, dedupe_key)
1. `notification_events` (sent/opened/delivered/failed metadata)
1. Update RLS policies so users manage only their own tokens/preferences; scheduling/sending writes restricted to service role.
1. Create Edge Function `supabase/functions/sync-push-token/index.ts` to upsert/revoke tokens from app session lifecycle.
1. Create Edge Function `supabase/functions/send-fcm/index.ts` for direct FCM HTTP v1 dispatch with idempotency keys, retry/backoff metadata, and structured error classification.
1. Create Edge Function `supabase/functions/process-scheduled-notifications/index.ts` run by pg_cron to pick due records, enforce frequency cap, and dispatch sends.

1. Phase 4 - Mobile Push Integration + Routing (*depends on phase 3 token API*)
1. Add `src/services/notificationService/pushTokenService.ts` for permission + token registration lifecycle (login, app foreground refresh, logout revoke).
1. Extend `src/services/notificationService/handler.ts` with response listeners for notification opened events and deep-link routing through Expo Router.
1. Integrate token sync into auth/session bootstrap (`app/_layout.tsx`, `src/context/AuthProvider.tsx`) and maintain existing local scheduling fallback.
1. Keep existing local scheduler in `src/services/notificationService/index.ts` for on-device daily reminders when push is unavailable or denied.

1. Phase 5 - Behavioral Rule Engine + Personalization (*depends on phase 3 events/preferences*)
1. Create notification rule module (`supabase/functions/process-scheduled-notifications/rules.ts`) with deterministic rules:
1. Inactive user X days -> reminder
1. Cycle phase contextual nudges -> personalized content
1. Adaptive frequency based on opens/ignores and active-hour windows
1. Build template catalog (`supabase/functions/_shared/notificationTemplates.ts`) with first-name fallback and phase-aware variants.
1. Implement send-window logic by timezone and active-hour heuristic from recent app events; enforce max 3/day hard cap and quiet hours.
1. Add anti-spam safeguards: per-user cooldown, dedupe window, and suppression when user recently logged.

1. Phase 6 - Analytics, Observability, Reliability (*parallel with phase 5 once event table exists*)
1. Track lifecycle events: `notification_scheduled`, `notification_sent`, `notification_opened`, `notification_failed`, `notification_engaged` via PostHog + DB event table.
1. Add Sentry capture for FCM failures and processing exceptions with correlation IDs.
1. Add operational dashboards/queries for delivery rate, open rate, and post-notification action conversion.
1. Add retry policy (exponential backoff with capped attempts), dead-letter marking, and replay tooling for failed jobs.

1. Phase 7 - Test Coverage and Rollout
1. Unit tests:
1. Haptics service mapping + throttle/fallback
1. Rule engine decisions + frequency caps + personalization fallbacks
1. Token sync and scheduler date/time logic (timezone + DST)
1. Integration tests:
1. App mutation -> analytics + haptic call assertions
1. Cron processing -> FCM send path -> event persistence
1. Notification open listener -> correct screen navigation + analytics
1. Edge-case matrix:
1. New user with missing profile fields
1. Inactive users crossing threshold
1. Missing/expired push token
1. Denied permissions
1. Timezone transitions (DST)
1. Progressive rollout: 5% -> 25% -> 100% with feature flags and KPI gates.

**Relevant files**
- `/Users/parishasharma/deepakkafolder/Soma/src/components/ui/Button.tsx` - replace inline haptics with service calls
- `/Users/parishasharma/deepakkafolder/Soma/src/components/ui/PressableScale.tsx` - optional haptic intent prop (default off)
- `/Users/parishasharma/deepakkafolder/Soma/src/screens/DailyLogScreen.tsx` - period/symptom/save feedback mapping
- `/Users/parishasharma/deepakkafolder/Soma/src/screens/QuickCheckinScreen.tsx` - mood/flow/save feedback mapping
- `/Users/parishasharma/deepakkafolder/Soma/src/screens/CalendarScreen.tsx` - calendar tap/nav/form action haptics and notification entry points
- `/Users/parishasharma/deepakkafolder/Soma/src/screens/SettingsScreen.tsx` - notification preference UI and permission toggles
- `/Users/parishasharma/deepakkafolder/Soma/src/services/notificationService/index.ts` - retain/refine local notification fallback scheduler
- `/Users/parishasharma/deepakkafolder/Soma/src/services/notificationService/handler.ts` - add response listeners and engagement tracking
- `/Users/parishasharma/deepakkafolder/Soma/app/_layout.tsx` - bootstrap notification handler and token sync lifecycle
- `/Users/parishasharma/deepakkafolder/Soma/src/context/AuthProvider.tsx` - token register/revoke on auth transitions
- `/Users/parishasharma/deepakkafolder/Soma/src/services/analytics/index.ts` - standardize event names/properties for haptics + notification lifecycle
- `/Users/parishasharma/deepakkafolder/Soma/supabase/schema.sql` and new migration files - new notification tables/functions/policies
- `/Users/parishasharma/deepakkafolder/Soma/supabase/rls_policies.sql` - RLS for push token/preferences/events access
- `/Users/parishasharma/deepakkafolder/Soma/supabase/functions/send-fcm/index.ts` - direct FCM dispatch
- `/Users/parishasharma/deepakkafolder/Soma/supabase/functions/process-scheduled-notifications/index.ts` - scheduled + behavioral execution
- `/Users/parishasharma/deepakkafolder/Soma/__tests__/unit/notificationService.test.ts` - extend for push integration and lifecycle events
- `/Users/parishasharma/deepakkafolder/Soma/__tests__/unit/analytics.test.ts` - event emission assertions
- `/Users/parishasharma/deepakkafolder/Soma/__tests__/unit/hapticsService.test.ts` - new haptics unit suite
- `/Users/parishasharma/deepakkafolder/Soma/__tests__/integration/notificationLifecycle.test.ts` - end-to-end scheduling/sending/open flow

**Verification**
1. Run `npm run typecheck`, `npm run lint`, `npm test` and ensure no regressions.
1. Validate local notifications still work when push permission is denied.
1. Validate push token sync: login/register, token refresh, logout revoke.
1. Simulate due notification processing and confirm status transitions (`pending -> sent/failed`) with retries.
1. Verify rate limits and quiet-hour suppression with timezone-aware test data.
1. Verify deep-link routing on notification open and follow-up user action tracking.
1. Perform real-device checks on iOS + Android for haptic intensity consistency and non-spam cadence.

**Decisions**
- Backend runtime: Supabase Edge Functions + pg_cron.
- Push transport recommendation: direct FCM HTTP v1 (project asked for FCM specifically).
- Personalization: centralized template catalog with first-name fallback and phase-aware copy.
- Frequency guardrail: max 3 notifications per user/day plus cooldown and quiet hours.
- Date handling rule: maintain local `YYYY-MM-DD` parsing for cycle math and avoid `toISOString()` day arithmetic regressions.
- Included in scope: haptics service, scheduled notifications, behavioral rule engine, analytics/observability hooks, tests.
- Excluded in this iteration: large UI redesign of Settings, partner messaging feature expansion beyond notification triggers, non-FCM providers.

**Further Considerations**
1. FCM credential management: Option A store encrypted service account in Supabase secrets (recommended), Option B external secret manager.
1. Scheduling precision: Option A per-minute cron polling + due-window query (recommended), Option B per-user job fan-out.
1. Delivery receipts: Option A infer from open/engagement only (faster), Option B add provider delivery webhooks later.
