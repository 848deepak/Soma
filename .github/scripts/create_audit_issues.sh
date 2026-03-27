#!/usr/bin/env bash
set -euo pipefail

REPO="848deepak/Soma"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is not installed."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "You are not logged in. Run: gh auth login"
  exit 1
fi

create_label_if_missing() {
  local name="$1"
  local color="$2"
  local desc="$3"
  gh label create "$name" --color "$color" --description "$desc" --repo "$REPO" >/dev/null 2>&1 || true
}

create_issue() {
  local title="$1"
  local labels="$2"
  local body="$3"

  local existing
  existing=$(gh issue list --repo "$REPO" --state all --search "in:title \"$title\"" --json title --jq '.[0].title // ""')
  if [[ "$existing" == "$title" ]]; then
    echo "Skipping existing issue: $title"
    return
  fi

  gh issue create --repo "$REPO" --title "$title" --label "$labels" --body "$body"
}

# Labels
create_label_if_missing "priority:critical" "B60205" "Critical severity"
create_label_if_missing "priority:high" "D93F0B" "High severity"
create_label_if_missing "priority:medium" "FBCA04" "Medium severity"
create_label_if_missing "type:bug" "D73A4A" "Bug"
create_label_if_missing "type:security" "5319E7" "Security issue"
create_label_if_missing "type:ux" "1D76DB" "UX issue"
create_label_if_missing "type:architecture" "0E8A16" "Architecture issue"
create_label_if_missing "area:auth" "C5DEF5" "Authentication"
create_label_if_missing "area:logging" "F9D0C4" "Logging"
create_label_if_missing "area:period" "FEF2C0" "Period tracking"
create_label_if_missing "area:ui" "BFDADC" "UI/UX"
create_label_if_missing "area:backend" "D4C5F9" "Backend/API"
create_label_if_missing "area:security" "E99695" "Security/Compliance"
create_label_if_missing "area:release" "BFD4F2" "Production readiness"
create_label_if_missing "area:notifications" "F9D0C4" "Push notifications"

# 1 Signup failure
create_issue \
  "Signup/New User Creation fails or leaves inconsistent profile state" \
  "type:bug,priority:critical,area:auth" \
  "### 🔴 Title:\nSignup/New User Creation fails or leaves inconsistent profile state\n\n### 📂 Category:\nBug\n\n### 🚨 Priority:\nCritical\n\n### 🧠 Description:\nAccount creation can fail silently or complete auth without creating a matching profile row. This leaves users in an inconsistent state and breaks onboarding/dashboard flows that depend on profiles.\n\n### 🔁 Steps to Reproduce:\n1. Open the app logged out.\n2. Attempt signup with valid email/password.\n3. Observe whether auth user is created and onboarding proceeds.\n4. Check profiles table for matching user row.\n\n### ✅ Expected Behavior:\nSignup atomically creates auth user and profile, then navigates to onboarding with clear feedback.\n\n### ❌ Actual Behavior:\nSignup may hang, fail without actionable error, or create auth user without profile.\n\n### 💡 Suggested Fix:\n1. Add explicit post-signup profile verification and rollback/retry path.\n2. Surface precise user-facing errors for trigger/profile failures.\n3. Add integration test covering signup + profile creation transactionally.\n\n### 📌 Additional Notes:\nAffected files: lib/auth.ts, src/screens/SignupScreen.tsx, supabase/schema.sql" 

# 2 Keyboard overlap
create_issue \
  "Keyboard overlap blocks form inputs on Settings, Setup, and Login screens" \
  "type:ux,type:bug,priority:critical,area:ui" \
  "### 🔴 Title:\nKeyboard overlap blocks form inputs on Settings, Setup, and Login screens\n\n### 📂 Category:\nUX\n\n### 🚨 Priority:\nCritical\n\n### 🧠 Description:\nKey form screens are not keyboard-safe and fields/actions become hidden behind soft keyboard, especially on small devices.\n\n### 🔁 Steps to Reproduce:\n1. Open Settings and focus cycle/profile inputs.\n2. Open Setup flow and focus text inputs/date controls.\n3. Open Login on small device and focus password field.\n\n### ✅ Expected Behavior:\nFocused input remains visible, screen shifts/scrolls, submit actions remain reachable.\n\n### ❌ Actual Behavior:\nKeyboard obscures focused inputs and actions; users cannot complete forms.\n\n### 💡 Suggested Fix:\n1. Wrap affected screens in KeyboardAvoidingView with platform-specific behavior/offset.\n2. Ensure ScrollView has keyboardShouldPersistTaps and dynamic bottom inset.\n3. Add device-matrix regression tests (iPhone SE + Android small).\n\n### 📌 Additional Notes:\nAffected files: src/screens/SettingsScreen.tsx, src/screens/SetupScreen.tsx, src/screens/LoginScreen.tsx" 

# 3 End cycle broken
create_issue \
  "End Period intermittently fails due to stale active-cycle state" \
  "type:bug,priority:critical,area:period" \
  "### 🔴 Title:\nEnd Period intermittently fails due to stale active-cycle state\n\n### 📂 Category:\nBug\n\n### 🚨 Priority:\nCritical\n\n### 🧠 Description:\nEnd-cycle action can fail with no-active-period errors when cache data is stale or race conditions occur around cycle resolution.\n\n### 🔁 Steps to Reproduce:\n1. Start a period.\n2. Wait several minutes.\n3. Tap End Period.\n\n### ✅ Expected Behavior:\nEnd Period should always resolve current active cycle and close it reliably.\n\n### ❌ Actual Behavior:\nAction intermittently fails and asks user to retry.\n\n### 💡 Suggested Fix:\n1. Force fresh active-cycle fetch before mutation.\n2. Make operation idempotent and protect against double-submit races.\n3. Tighten cache invalidation and staleTime strategy for cycle hooks.\n\n### 📌 Additional Notes:\nAffected files: hooks/useCycleActions.ts, hooks/useCurrentCycle.ts" 

# 4 Logging overwrite
create_issue \
  "Daily log upsert overwrites prior same-day data instead of merging" \
  "type:bug,priority:critical,area:logging" \
  "### 🔴 Title:\nDaily log upsert overwrites prior same-day data instead of merging\n\n### 📂 Category:\nBug\n\n### 🚨 Priority:\nCritical\n\n### 🧠 Description:\nCurrent onConflict upsert for (user_id, date) causes partial payload saves to wipe previously-entered fields for the same day.\n\n### 🔁 Steps to Reproduce:\n1. Save symptoms/notes in Daily Log.\n2. Later save mood/flow in Quick Check-in.\n3. Re-open same day log.\n\n### ✅ Expected Behavior:\nNew values should merge with existing non-empty fields unless user explicitly replaces all.\n\n### ❌ Actual Behavior:\nSecond save nulls/overwrites fields from first save.\n\n### 💡 Suggested Fix:\n1. Read existing row then merge payload server/client-side before write.\n2. Add overwrite-warning UX when destructive replacement is about to happen.\n3. Add regression test for multi-entry same-day scenarios.\n\n### 📌 Additional Notes:\nAffected files: hooks/useSaveLog.ts, supabase/schema.sql" 

# 5 Duplicate logging systems
create_issue \
  "Dual logging entry points (Log button vs Plus button) diverge in schema and behavior" \
  "type:architecture,type:bug,priority:critical,area:logging" \
  "### 🔴 Title:\nDual logging entry points (Log button vs Plus button) diverge in schema and behavior\n\n### 📂 Category:\nArchitecture\n\n### 🚨 Priority:\nCritical\n\n### 🧠 Description:\nTwo distinct logging UIs submit different field subsets into one daily log record, creating conflicting behavior and user confusion.\n\n### 🔁 Steps to Reproduce:\n1. Log from primary Daily Log path.\n2. Log from Plus/Quick Check-in path.\n3. Compare captured fields and resulting persisted record.\n\n### ✅ Expected Behavior:\nBoth entry points should share one canonical schema and data contract.\n\n### ❌ Actual Behavior:\nPayload divergence causes inconsistent records and data loss.\n\n### 💡 Suggested Fix:\n1. Consolidate into one canonical logging form/service contract.\n2. If two UIs remain, enforce common payload with explicit partial-update semantics.\n3. Add contract tests to keep screens and backend in sync.\n\n### 📌 Additional Notes:\nAffected files: src/screens/HomeScreen.tsx, src/screens/DailyLogScreen.tsx, src/screens/QuickCheckinScreen.tsx, hooks/useSaveLog.ts" 

# 6 Log without cycle
create_issue \
  "App allows logging without active period, producing orphaned cycle data" \
  "type:bug,priority:high,area:period,area:logging" \
  "### 🔴 Title:\nApp allows logging without active period, producing orphaned cycle data\n\n### 📂 Category:\nBug\n\n### 🚨 Priority:\nHigh\n\n### 🧠 Description:\nUsers can submit logs when no active cycle exists; records persist with null cycle linkage and degrade cycle analytics integrity.\n\n### 🔁 Steps to Reproduce:\n1. Ensure no active period exists.\n2. Submit log from quick check-in.\n3. Inspect persisted row for cycle_id/cycle_day.\n\n### ✅ Expected Behavior:\nEither block logging until cycle starts or explicitly support non-cycle logs with distinct model.\n\n### ❌ Actual Behavior:\nLogs save with null cycle linkage silently.\n\n### 💡 Suggested Fix:\n1. Add pre-submit guard and CTA to start period.\n2. Optionally enforce schema constraint or separate non-cycle log type.\n3. Add analytics-safe handling for legacy orphan rows.\n\n### 📌 Additional Notes:\nAffected files: hooks/useSaveLog.ts, supabase/schema.sql" 

# 7 Start period date UX
create_issue \
  "Start Period date input should default to today with manual override" \
  "type:ux,priority:high,area:period,area:ui" \
  "### 🔴 Title:\nStart Period date input should default to today with manual override\n\n### 📂 Category:\nUX\n\n### 🚨 Priority:\nHigh\n\n### 🧠 Description:\nPeriod start field initializes empty and relies on manual typing, increasing friction and format errors in core flow.\n\n### 🔁 Steps to Reproduce:\n1. Open Start Period modal.\n2. Observe start date value and input method.\n\n### ✅ Expected Behavior:\nDefault date = today, with date picker/manual override available.\n\n### ❌ Actual Behavior:\nEmpty/manual date entry path with avoidable user effort.\n\n### 💡 Suggested Fix:\n1. Initialize startDate with local today (timezone-safe).\n2. Replace free-text entry with date picker + quick actions.\n3. Keep strict validation and inline error guidance.\n\n### 📌 Additional Notes:\nAffected files: src/components/ui/PeriodLogModal.tsx" 

# 8 Settings not production ready
create_issue \
  "Settings page needs production UX hierarchy, validation feedback, and polish" \
  "type:ux,priority:high,area:ui" \
  "### 🔴 Title:\nSettings page needs production UX hierarchy, validation feedback, and polish\n\n### 📂 Category:\nUX\n\n### 🚨 Priority:\nHigh\n\n### 🧠 Description:\nSettings layout and interaction model are not production-ready for a health app: weak hierarchy, inconsistent form affordances, and limited feedback states.\n\n### 🔁 Steps to Reproduce:\n1. Navigate through all settings sections.\n2. Edit profile/cycle values and save.\n3. Observe visual hierarchy and validation clarity.\n\n### ✅ Expected Behavior:\nClear grouped sections, consistent controls, explicit validation/loading/success states.\n\n### ❌ Actual Behavior:\nDense layout, ambiguous grouping, and weak interaction feedback.\n\n### 💡 Suggested Fix:\n1. Restructure sections into clear cards/groups.\n2. Add inline validation and save-state affordances.\n3. Add accessibility checks (contrast, focus order, target size).\n\n### 📌 Additional Notes:\nAffected files: src/screens/SettingsScreen.tsx" 

# 9 Missing icon
create_issue \
  "App icon configuration is incomplete for production device/store requirements" \
  "type:bug,priority:high,area:release" \
  "### 🔴 Title:\nApp icon configuration is incomplete for production device/store requirements\n\n### 📂 Category:\nBug\n\n### 🚨 Priority:\nHigh\n\n### 🧠 Description:\nCurrent icon setup does not comprehensively cover platform variants and can cause blurry rendering or store submission issues.\n\n### 🔁 Steps to Reproduce:\n1. Inspect app.json icon/adaptiveIcon settings.\n2. Build and inspect icons on iOS/iPad/Android launchers.\n\n### ✅ Expected Behavior:\nAll required icon assets are declared and render crisply across targets.\n\n### ❌ Actual Behavior:\nPartial asset/config coverage with inconsistent results.\n\n### 💡 Suggested Fix:\n1. Generate full icon matrix for iOS/Android including adaptive/monochrome assets.\n2. Update app.json references and validate with production builds.\n3. Add CI check for required icon files.\n\n### 📌 Additional Notes:\nAffected files: app.json, assets/images" 

# 10 Splash white screen
create_issue \
  "Launch shows white-screen/splash mismatch before themed UI loads" \
  "type:bug,type:ux,priority:critical,area:ui,area:release" \
  "### 🔴 Title:\nLaunch shows white-screen/splash mismatch before themed UI loads\n\n### 📂 Category:\nBug\n\n### 🚨 Priority:\nCritical\n\n### 🧠 Description:\nApp launch pipeline shows unintended light splash/blank state before intended themed content, especially visible in dark mode.\n\n### 🔁 Steps to Reproduce:\n1. Set app/device to dark mode.\n2. Cold start app.\n3. Observe initial launch transition.\n\n### ✅ Expected Behavior:\nNo white flash; splash and first UI frame match theme and transition smoothly.\n\n### ❌ Actual Behavior:\nVisible light/blank frame appears before app content.\n\n### 💡 Suggested Fix:\n1. Align native splash and custom splash colors by theme.\n2. Remove competing timeout fallbacks in bootstrap path.\n3. Ensure first render background matches splash until hydration completes.\n\n### 📌 Additional Notes:\nAffected files: app/_layout.tsx, src/components/ui/SomaLoadingSplash.tsx, app.json" 

# 11 No rate limiting
create_issue \
  "No API rate limiting across Supabase Edge Functions" \
  "type:security,type:bug,priority:critical,area:backend,area:security" \
  "### 🔴 Title:\nNo API rate limiting across Supabase Edge Functions\n\n### 📂 Category:\nSecurity\n\n### 🚨 Priority:\nCritical\n\n### 🧠 Description:\nEdge Functions currently lack request throttling, exposing service to abuse, brute-force attempts, and resource exhaustion.\n\n### 🔁 Steps to Reproduce:\n1. Send high-volume requests to public function endpoints.\n2. Observe absence of throttling or 429 responses.\n\n### ✅ Expected Behavior:\nPer-IP/per-user limits with 429 responses and retry semantics.\n\n### ❌ Actual Behavior:\nUnlimited request acceptance.\n\n### 💡 Suggested Fix:\n1. Add centralized rate-limit middleware (KV/Redis-backed).\n2. Define endpoint-specific quotas and response headers.\n3. Add abuse telemetry and alerting for threshold breaches.\n\n### 📌 Additional Notes:\nAffected files: supabase/functions/*/index.ts" 

# 12 N+1 notifications processor
create_issue \
  "process-scheduled-notifications has N+1 query pattern and scalability risk" \
  "type:bug,type:architecture,priority:high,area:backend,area:notifications" \
  "### 🔴 Title:\nprocess-scheduled-notifications has N+1 query pattern and scalability risk\n\n### 📂 Category:\nPerformance\n\n### 🚨 Priority:\nHigh\n\n### 🧠 Description:\nScheduled notification processing performs repeated per-item queries for related entities, causing query explosion under load.\n\n### 🔁 Steps to Reproduce:\n1. Seed medium/large scheduled notification batch.\n2. Execute processor and inspect query count/duration.\n\n### ✅ Expected Behavior:\nBatch-prefetch related data once, then process in-memory maps.\n\n### ❌ Actual Behavior:\nRepeated per-notification lookups increase latency and failure risk.\n\n### 💡 Suggested Fix:\n1. Prefetch preferences/profiles/cycles/logs using IN queries.\n2. Build keyed maps and process loop without DB roundtrips.\n3. Add load tests and SLO thresholds for processor runtime.\n\n### 📌 Additional Notes:\nAffected file: supabase/functions/process-scheduled-notifications/index.ts" 

# 13 Push token validation
create_issue \
  "sync-push-token accepts malformed tokens and pollutes notification registry" \
  "type:security,type:bug,priority:high,area:backend,area:notifications" \
  "### 🔴 Title:\nsync-push-token accepts malformed tokens and pollutes notification registry\n\n### 📂 Category:\nSecurity\n\n### 🚨 Priority:\nHigh\n\n### 🧠 Description:\nToken sync endpoint lacks strict token validation, allowing invalid entries that degrade delivery reliability and can be abused.\n\n### 🔁 Steps to Reproduce:\n1. Submit short/invalid token payloads to sync endpoint.\n2. Confirm insertion into push token storage.\n\n### ✅ Expected Behavior:\nReject malformed tokens with 400 and preserve clean token set.\n\n### ❌ Actual Behavior:\nInvalid tokens are accepted and stored.\n\n### 💡 Suggested Fix:\n1. Reuse strict token validator used in send path.\n2. Enforce schema constraints for token length/pattern.\n3. Add cleanup job for existing invalid tokens.\n\n### 📌 Additional Notes:\nAffected file: supabase/functions/sync-push-token/index.ts" 

# 14 Health data encryption
create_issue \
  "Sensitive health data lacks robust at-rest encryption strategy" \
  "type:security,priority:critical,area:security,area:backend" \
  "### 🔴 Title:\nSensitive health data lacks robust at-rest encryption strategy\n\n### 📂 Category:\nSecurity\n\n### 🚨 Priority:\nCritical\n\n### 🧠 Description:\nCore health fields are stored without a clearly enforced at-rest encryption strategy for highly sensitive content, increasing breach impact.\n\n### 🔁 Steps to Reproduce:\n1. Inspect schema/storage paths for notes/symptoms/health signals.\n2. Verify whether encrypted storage path is guaranteed end-to-end.\n\n### ✅ Expected Behavior:\nSensitive fields protected with enforceable encryption policy and key management.\n\n### ❌ Actual Behavior:\nNo guaranteed policy-level protection for all sensitive fields.\n\n### 💡 Suggested Fix:\n1. Define and implement encryption policy for sensitive columns.\n2. Use secure key management and audited decrypt pathways.\n3. Add compliance-focused tests/documentation for data protection controls.\n\n### 📌 Additional Notes:\nAffected files: supabase/schema.sql, security/storage paths" 

# 15 Partner access audit
create_issue \
  "Partner data access lacks complete immutable audit trail" \
  "type:security,priority:high,area:security,area:backend" \
  "### 🔴 Title:\nPartner data access lacks complete immutable audit trail\n\n### 📂 Category:\nSecurity\n\n### 🚨 Priority:\nHigh\n\n### 🧠 Description:\nHealth-data partner access is not fully traceable with immutable access logs suitable for compliance and forensic needs.\n\n### 🔁 Steps to Reproduce:\n1. Link partner accounts and access shared data views.\n2. Attempt to retrieve complete who/what/when access history.\n\n### ✅ Expected Behavior:\nEvery partner access event is durably logged and queryable with immutable records.\n\n### ❌ Actual Behavior:\nAccess observability is incomplete/inconsistent.\n\n### 💡 Suggested Fix:\n1. Create immutable audit table and write path for partner data reads.\n2. Include actor, target user, fields/resources, timestamp, request context.\n3. Expose user-facing access history and admin export tooling.\n\n### 📌 Additional Notes:\nAffected files: supabase/schema.sql, supabase/rls_policies.sql" 

echo "Issue creation run complete."
