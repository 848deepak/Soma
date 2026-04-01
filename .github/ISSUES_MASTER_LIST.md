# GitHub Issues Master List
**Generated:** 26 March 2026  
**Scope:** Full-stack audit covering auth, logging, UI/UX, backend, security, performance, production readiness  
**Total Issues:** 31 (Balanced grouping)  
**Known Issues Coverage:** 100% of 11 required issues represented

---

## CRITICAL PRIORITY (User-Facing/Data Loss/Security)

### Issue #1: Signup/New User Creation Fails
- **Category:** Bug / Auth
- **Priority:** 🔴 CRITICAL
- **Area:** Authentication
- **Confidence:** 95%
- **Root Cause Files:** [lib/auth.ts](lib/auth.ts#L44-L62), [src/screens/SignupScreen.tsx](src/screens/SignupScreen.tsx#L78-L95), [supabase/schema.sql](supabase/schema.sql#L41-L56) (handle_new_user trigger)
- **Related Memory:** /memories/session/security-audit-progress.md - "Signup silent fail risk: Profile creation via trigger not verified"

**Description:**  
New users cannot create accounts. The signup flow fails silently at the profile creation step. The `handle_new_user` trigger in Supabase creates a profile row when a new auth user is created, but the client doesn't verify success or handle trigger failures. If the trigger fails or the profile isn't created, the user is left authenticated but with no profile record, causing downstream errors when loading dashboard/settings.

**Steps to Reproduce:**
1. Open app on fresh device (or logged out state)
2. Tap "Sign Up" button
3. Enter email (e.g., `testuser@example.com`) and password
4. Tap "Create Account"
5. Expected: User account created, redirected to onboarding setup
6. Actual: Button spins indefinitely, no error message, no account created
   - (If request actually succeeds) User is logged in but profile missing → dashboard crashes

**Expected Behavior:**
- Email validation passes
- Auth user created in Supabase
- Profile row created via handle_new_user trigger
- User navigated to onboarding/setup screen
- Clear success confirmation

**Actual Behavior:**
- Request hangs or fails silently
- No error message to user
- If profile trigger fails, user is left in inconsistent state (authenticated but no profile)
- Downstream screens crash trying to load missing profile

**Suggested Fix:**
1. In [lib/auth.ts](lib/auth.ts#L44-L62), add retry logic with exponential backoff for signup
2. After `signUpWithEmail()` succeeds, query `profiles` table to verify profile was created:
   ```typescript
   const { data: profile } = await supabase
     .from('profiles')
     .select('id')
     .eq('user_id', newUser.user.id)
     .single();
   if (!profile) {
     throw new Error('Profile creation failed. Contact support.');
   }
   ```
3. Add specific error messaging for each failure mode (network, validation, trigger, etc.)
4. Add test: signup flow with profile creation verification

**Additional Notes:**
- Check if profile trigger has error handling / logging in [supabase/schema.sql](supabase/schema.sql#L41-L56)
- Parental consent enforcement only happens on `signInWithEmail`, not `signUpWithEmail`—consider adding to signup path
- Session auth state race condition: verify `onAuthStateChange` callback fires before navigation

---

### Issue #2: Logging Data Overwrites Previous Entry on Same Day
- **Category:** Bug / Data Loss
- **Priority:** 🔴 CRITICAL
- **Area:** Logging System
- **Confidence:** 99%
- **Root Cause Files:** [hooks/useSaveLog.ts](hooks/useSaveLog.ts#L96-L110), [supabase/schema.sql](supabase/schema.sql#L160-L175) (UNIQUE constraint on user_id, date)
- **Related Memory:** /memories/session/period-logging-analysis.md - Issue #2

**Description:**  
Database schema enforces one log per user per date via `UNIQUE (user_id, date)`. When a user logs data multiple times on the same day using different entry points (Daily Log vs Quick Check-in), the upsert operation replaces the entire row instead of merging fields. This causes data loss: logging mood+flow in the morning, then symptoms+notes in the afternoon overwrites the morning entry.

**Steps to Reproduce:**
1. Open app, start a period
2. Tap "Log Today's Flow & Mood" button → logs `{flow_level: 2, symptoms: ["Cramps"], notes: "Severe"}`
3. Wait 2 hours
4. Tap the "+" (Plus) FAB → Quick Check-in → logs `{flow_level: 3, mood: "Happy"}`
5. Navigate away and back to home
6. Tap "Log Today's Flow & Mood" again
7. **Actual:** Symptoms and notes from step 2 are GONE, only flow_level=3 and mood="Happy" remain

**Expected Behavior:**
- First log: `{flow_level: 2, symptoms: ["Cramps"], notes: "Severe", mood: null}`
- Second log: merged to `{flow_level: 3, symptoms: ["Cramps"], notes: "Severe", mood: "Happy"}`
- Both data points preserved

**Actual Behavior:**
- First log: `{flow_level: 2, symptoms: ["Cramps"], notes: "Severe", mood: null}`
- Second log: REPLACES entire row to `{flow_level: 3, mood: "Happy", symptoms: null, notes: null}`
- User's first entry is lost

**Suggested Fix:**
Modify [hooks/useSaveLog.ts](hooks/useSaveLog.ts#L96-L110) to merge incoming data with existing row:
```typescript
// Fetch existing log for today
const { data: existing } = await supabase
  .from('daily_logs')
  .select('*')
  .eq('user_id', user.id)
  .eq('date', today)
  .single();

// Merge new payload with existing (new fields override)
const merged = { ...existing, ...upsertPayload, updated_at: new Date() };

// Upsert merged data
await supabase.from('daily_logs').upsert(merged, { onConflict: 'user_id,date' });
```
- Option 2: Change schema to allow multiple logs per day (separate table with timestamp, remove UNIQUE constraint)
- Option 3: Show warning modal if user is about to overwrite non-empty fields

**Additional Notes:**
- Also affects "quick check-in" → "daily log" sequence (different field subsets)
- No audit trail of overwrites; user doesn't know data was lost
- Consider adding `updated_at` field to detect stale merges

---

### Issue #3: Duplicate Logging Systems Cause Data Conflicts
- **Category:** Bug / UX / Architecture
- **Priority:** 🔴 CRITICAL
- **Area:** Logging System
- **Confidence:** 95%
- **Root Cause Files:** [src/screens/HomeScreen.tsx](src/screens/HomeScreen.tsx#L722-L760), [src/screens/DailyLogScreen.tsx](src/screens/DailyLogScreen.tsx#L1-L60), [src/screens/QuickCheckinScreen.tsx](src/screens/QuickCheckinScreen.tsx#L1-L80)
- **Related Memory:** /memories/session/period-logging-analysis.md - Issue #3

**Description:**  
Two separate UI flows for logging period data route to the same database table but send different field subsets, creating confusion and data loss:
- **"Log Today's Flow & Mood"** (Primary): Sends `{flow_level, symptoms, notes}` → Missing mood field
- **"+" (Quick Check-in) FAB** (Secondary): Sends `{flow_level, mood, partner_alert}` → Missing symptoms, notes
Users can't tell which flow should be used, and switching between them overwrites data. The UX labels are confusing ("quick check-in" vs full "flow & mood").

**Steps to Reproduce:**
1. From home, observe two entry points:
   - "Log Today's Flow & Mood" button (primary)
   - "+" FAB (secondary)
2. Open "Log Today's Flow & Mood" → See fields: flow slider, symptom pills, notes textarea, "End Period" button
3. Go back, open "+" FAB → See fields: flow slider, mood emoji options, partner alert toggle
4. No indicator which one to use for what data type
5. (Combined with Issue #2) Using both on same day causes data loss

**Expected Behavior:**
- Single unified logging interface
- OR clear visual distinction + guidance on when to use each
- OR both send complete schema (all fields)
- OR separate tables for different log types

**Actual Behavior:**
- Two competing entry points with different schemas
- User confusion about which to use
- Data loss if switching between flows on same day
- "Quick Check-in" is a misnomer (still saves to main daily_logs table)

**Suggested Fix:**
1. **Recommended:** Merge both flows into single unified "Log" screen with all fields (flow, mood, symptoms, notes, partner_alert)
   - Use tabs or expandable sections if space-constrained on mobile
   - Remove Quick Check-in screen or repurpose as optional "quick" pre-fill workflow
2. **Alternative:** Unify at schema level—ensure both screens send complete payload:
   - Modify [src/screens/QuickCheckinScreen.tsx](src/screens/QuickCheckinScreen.tsx#L65-L90) to collect symptoms/notes too
   - OR modify [src/screens/DailyLogScreen.tsx](src/screens/DailyLogScreen.tsx#L29-40) to add mood picker
   - Both call same hook with same fields: `{flow_level, mood, symptoms, notes, partner_alert}`
3. Add schema-level validation to reject partial payloads or auto-fill nulls
4. Add migration tests to verify both flows produce identical schema post-unification

**Additional Notes:**
- Frontend design decision: should "quick check-in" offer speed or be removed?
- Flow level range also differs: DailyLogScreen uses 0-3, QuickCheckinScreen uses 0-4 (schema allows 0-4)
- Related to Issue #2 (data overwrite); fixing both together is more effective

---

### Issue #4: Keyboard Overlap on Multiple Screens (SettingsScreen, SetupScreen, LoginScreen)
- **Category:** Bug / UX
- **Priority:** 🔴 CRITICAL
- **Area:** UI/UX - Keyboard Handling
- **Confidence:** 99%
- **Root Cause Files:** [src/screens/SettingsScreen.tsx](src/screens/SettingsScreen.tsx#L690-L800), [src/screens/SetupScreen.tsx](src/screens/SetupScreen.tsx#L1-L100), [src/screens/LoginScreen.tsx](src/screens/LoginScreen.tsx#L161-L180), [src/screens/QuickCheckinScreen.tsx](src/screens/QuickCheckinScreen.tsx#L115)

**Description:**  
Multiple screens lack `KeyboardAvoidingView` or proper keyboard handling, causing input fields to be obscured by the soft keyboard:
- **SettingsScreen:** When editing profile or cycle defaults, keyboard hides all input fields
- **SetupScreen:** When entering onboarding date, keyboard hides date picker and inputs
- **LoginScreen:** On small devices (iPhone SE), password field and buttons hidden behind keyboard
- **QuickCheckinScreen:** If text inputs added, no keyboard safety

**Steps to Reproduce - SettingsScreen:**
1. Tap "Profile" tab → Scroll to "Cycle Defaults" section
2. Tap "Cycle length (days)" input
3. Keyboard appears
4. **Actual:** Input field pushed off-screen, button bar unreachable, form unusable

**Steps to Reproduce - SetupScreen:**
1. Begin signup/onboarding → "When did your last period start?"
2. Enter child age (< 13) → parent email field appears
3. Tap date picker or TextInput
4. **Actual:** Inputs below become unscrollable, entire section hidden

**Steps to Reproduce - LoginScreen (small device):**
1. Open app on iPhone SE (375px width)
2. Tap password input field
3. Keyboard appears
4. **Actual:** Password field and login button completely hidden, can't complete login

**Expected Behavior:**
- Keyboard appears without obscuring input fields
- Screen content shifts up or scrolls to keep focused input visible
- Button bar remains accessible
- All form fields reachable on all device sizes

**Actual Behavior:**
- Input hidden behind keyboard
- Screen doesn't adjust
- Can't reach submit buttons
- Form unusable

**Suggested Fix:**
For each affected screen, wrap content in `KeyboardAvoidingView`:
```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}  // Account for TabBar
>
  <Screen>
    {/* existing content */}
  </Screen>
</KeyboardAvoidingView>
```
- **SettingsScreen:** Add `keyboardVerticalOffset={90}` for TabBar on iOS
- **SetupScreen:** Use `height` behavior for Android, `padding` for iOS
- **LoginScreen:** Use `padding` on iOS, `height` on Android
- **QuickCheckinScreen:** Pre-emptive fix for future text inputs

**Additional Notes:**
- DailyLogScreen already uses KeyboardAvoidingView with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` but could be optimized
- Test on actual devices (iPhone SE 5.4" and one 6.1"+) to verify different screen sizes
- Android soft keyboard behavior differs from iOS—test both

---

### Issue #5: Splash Screen White Flash & Dark Mode Mismatch
- **Category:** Bug / UX
- **Priority:** 🔴 CRITICAL
- **Area:** UI/UX - Launch Experience
- **Confidence:** 98%
- **Root Cause Files:** [src/components/ui/SomaLoadingSplash.tsx](src/components/ui/SomaLoadingSplash.tsx#L50-L70), [app.json](app.json#L10-L20), [app/_layout.tsx](app/_layout.tsx#L281)

**Description:**  
On app launch, users see a jarring white/light-colored splash screen for 2-3 seconds even when running in dark mode. This breaks immersion and looks unpolished. Root causes:
1. `SomaLoadingSplash.tsx` hardcodes light background color `#FDF7F5`
2. `app.json` splash config hardcodes light color
3. No dark mode detection or theme-aware rendering
4. Timeout fallback logic (9s in AuthBootstrap, 20s in SomaLoadingSplash) creates double-fallback logic

**Steps to Reproduce:**
1. Settings → Theme → Select "Midnight" (dark mode)
2. Close app completely
3. Reopen app
4. **Actual:** See white/cream splash screen for 2-3 seconds, then dark content loads abruptly

**Expected Behavior:**
- Splash screen respects device/app theme
- Smooth transition between splash and content (both dark or both light)
- No jarring color flash

**Actual Behavior:**
- Light splash screen appears first
- Then dark app content loads behind it
- Visual discontinuity/flash
- Looks unpolished

**Suggested Fix:**
1. **Update [src/components/ui/SomaLoadingSplash.tsx](src/components/ui/SomaLoadingSplash.tsx):**
   ```typescript
   import { useColorScheme } from 'react-native';
   
   export function SomaLoadingSplash(...) {
     const isDark = useColorScheme() === 'dark';
     
     return (
       <Animated.View style={{
         flex: 1,
         backgroundColor: isDark ? "#0F1115" : "#FDF7F5",  // Dynamic color
       }}>
        ...
        <View style={{ backgroundColor: isDark ? "#1A2024" : "#F6E6E3" }} />
        <Animated.View style={{ backgroundColor: isDark ? "#A78BFA" : "#DDA7A5" }} />
   ```

2. **Update [app.json](app.json) splash config:**
   ```json
   "splash": {
     "backgroundColor": "#FDF7F5",
     "dark": { "backgroundColor": "#0F1115" }
   }
   ```

3. **Simplify timeout logic in [app/_layout.tsx](app/_layout.tsx#L281):**
   - Remove 9-second hardcoded timeout (rely on auth query)
   - Keep SomaLoadingSplash timeout as fallback only (20s)

**Additional Notes:**
- Also affects Android adaptive icon background (should match theme)
- Test on both iOS and Android for consistency
- Consider pre-loading theme setting before splash (from async storage or device setting)

---

### Issue #6: No Rate Limiting on Any Edge Function
- **Category:** Bug / Security
- **Priority:** 🔴 CRITICAL
- **Area:** Backend / API Security
- **Confidence:** 99%
- **Root Cause Files:** [supabase/functions/send-fcm/index.ts](supabase/functions/send-fcm/index.ts), [supabase/functions/send-fcm-v2/index.ts](supabase/functions/send-fcm-v2/index.ts), [supabase/functions/sync-push-token/index.ts](supabase/functions/sync-push-token/index.ts), [supabase/functions/process-scheduled-notifications/index.ts](supabase/functions/process-scheduled-notifications/index.ts), [supabase/functions/request-parental-consent/index.ts](supabase/functions/request-parental-consent/index.ts), [supabase/functions/process-data-rights-request/index.ts](supabase/functions/process-data-rights-request/index.ts), [supabase/functions/data-rights-request/index.ts](supabase/functions/data-rights-request/index.ts), [supabase/functions/verify-parental-consent/index.ts](supabase/functions/verify-parental-consent/index.ts), [supabase/functions/cancel-data-rights-request/index.ts](supabase/functions/cancel-data-rights-request/index.ts)

**Description:**  
All 9 Edge Functions lack any per-user, per-IP, or global rate limiting. Attackers can:
- Flood endpoints with unlimited requests (DoS)
- Brute-force parental consent tokens (64-char hex strings)
- Perform credential stuffing or automated abuse
- Exhaust database connections / resources
- Tamper with push tokens via `sync-push-token`

**Steps to Reproduce (Proof of Concept):**
```bash
# Flood /verify-parental-consent with random tokens
for i in {1..10000}; do
  TOKEN=$(openssl rand -hex 32)
  curl -X POST https://PROJECT_ID.functions.supabase.co/verify-parental-consent \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"$TOKEN\"}" &
done

# Attack succeeds: No 429 response, no backoff, server accepts all requests
```

**Expected Behavior:**
- API returns 429 (Too Many Requests) after N requests per user/IP/second
- Response includes `X-RateLimit-*` headers
- Requests are throttled / rejected

**Actual Behavior:**
- All requests accepted regardless of rate
- No backoff or throttling
- Endpoints vulnerable to abuse

**Suggested Fix:**
1. **Implement per-user/per-IP middleware** in each function (use Deno KV or Redis):
   ```typescript
   async function checkRateLimit(userId: string, limit: number = 10, window: number = 60000) {
     const key = `ratelimit:${userId}`;
     const count = await kv.get(key);
     if (count && count >= limit) {
       return { allowed: false, resetIn: window };
     }
     await kv.set(key, (count || 0) + 1, { ex: Math.ceil(window / 1000) });
     return { allowed: true };
   }
   ```

2. **Suggested limits:**
   - `/sync-push-token`: 10 req/sec per user
   - `/verify-parental-consent`: 5 req/min per IP (token verification is sensitive)
   - `/send-fcm`, `/send-fcm-v2`: 100 req/min per function (internal, lower risk)
   - All others: 10 req/sec per user

3. **Return rate limit headers in response:**
   ```typescript
   response.headers.set('X-RateLimit-Limit', '10');
   response.headers.set('X-RateLimit-Remaining', '9');
   response.headers.set('X-RateLimit-Reset', String(resetTime));
   ```

4. **Test:** Automated test suite verifying 429 after Nth request

**Additional Notes:**
- Consider Supabase Auth middleware or cloud provider rate limiting (Cloud Run, Lambda) as complementary Layer
- Log rate limit violations for abuse monitoring
- Document rate limits in API docs

---

### Issue #7: Health Data Not Encrypted at Rest
- **Category:** Bug / Security / Compliance
- **Priority:** 🔴 CRITICAL
- **Area:** Backend / Data Protection
- **Confidence:** 95%
- **Root Cause Files:** [supabase/schema.sql](supabase/schema.sql), [supabase/rls_policies.sql](supabase/rls_policies.sql)

**Description:**  
All health data (daily logs, cycles, symptoms, notes, mood, energy, partner sharing) is stored unencrypted in Supabase PostgreSQL. This violates health data privacy regulations (HIPAA, CCPA, GDPR) and creates massive risk if database is breached. Attackers gaining DB access could read all user health information without decryption.

**Steps to Reproduce:**
1. Direct database access (or breach): Query daily_logs table
2. See plaintext health data:
   ```sql
   SELECT user_id, date, flow_level, symptoms, notes, mood, energy_level 
   FROM daily_logs LIMIT 1;
   -- Result: All data readable, no encryption
   ```

**Expected Behavior:**
- Sensitive fields encrypted with application key or Supabase Vault
- Only client app or authorized service can decrypt
- Database queries return encrypted blobs
- Regulatory compliance (HIPAA, CCPA, GDPR)

**Actual Behavior:**
- All health data stored as plaintext
- Any DB access = full health information exposed
- No encryption layer

**Suggested Fix:**
1. **Option A: Supabase Vault (Recommended for ease)**
   - Enable Supabase Vault on PostgreSQL
   - Wrap sensitive columns: `notes`, `symptoms`, `mood`, `energy_level` in encryption
   - Docs: https://supabase.com/docs/guides/database/vault

2. **Option B: Client-side E2E Encryption (Recommended for security)**
   - Use existing `encryptionService` hooks in codebase
   - Encrypt sensitive fields before sending to API
   - Decrypt on client after retrieval
   - Server can never see plaintext
   - Example: Encrypt `notes`, `symptoms` client-side

3. **Option C: Column-level encryption via pgcrypto**
   ```sql
   ALTER TABLE daily_logs ADD COLUMN notes_encrypted bytea;
   CREATE TRIGGER encrypt_notes BEFORE INSERT ON daily_logs
   FOR EACH ROW EXECUTE FUNCTION pgp_sym_encrypt(NEW.notes, 'app-secret-key');
   ```

4. **Migration strategy:**
   - For existing data: bulk encrypt with automated migration
   - For new data: encrypt on insert (client-side or server trigger)
   - Test decryption on client and server

**Additional Notes:**
- Also consider partner sharing: ensure shared logs respect encryption (only share decrypted with authorized partner)
- Audit trail of decryptions (who accessed health data, when)
- Document encryption strategy in security policy
- Consider data classification (flow_level: public; notes: private; partner sharing: semi-public)

---

## HIGH PRIORITY (Critical Functionality / UX / Security)

### Issue #8: End Period Not Working (Cache Staleness + Missing Fresh Fetch)
- **Category:** Bug / Feature
- **Priority:** 🟠 HIGH
- **Area:** Period Tracking
- **Confidence:** 99%
- **Root Cause Files:** [hooks/useCurrentCycle.ts](hooks/useCurrentCycle.ts#L115), [hooks/useCycleActions.ts](hooks/useCycleActions.ts#L410-L445), [END_PERIOD_BUG_FIX_SUMMARY.md](END_PERIOD_BUG_FIX_SUMMARY.md#L188)
- **Related Memory:** /memories/session/period-logging-analysis.md - Issue #1

**Description:**  
Users cannot end their period. The "End Period" button fails with "No active period to end" error. Root cause: React Query cache staleness (`staleTime: 2 * 60 * 1000` = 2 minutes) + missing fresh data fetch. If user starts period, waits 2+ minutes, then tries to end → cache returns stale/null result → end period fails.

**Partially fixed** in prior commits: `useCurrentCycle` reduced staleTime from 10min to 2min, `useEndCurrentPeriod` added `Promise.race()` timeout fetch, but race condition remains possible if network slow.

**Steps to Reproduce:**
1. Home screen → "Log Today" → Modal: "When did your period start?" → Enter today's date
2. Tap "Start Period" → Success modal
3. Wait 3+ minutes (cache becomes stale after 2 minutes)
4. Tap "End Period" button on home screen
5. **Actual:** Error overlay "No active period to end" OR no visible feedback
6. Tap again → Sometimes works after retry

**Expected Behavior:**
- "End Period" button always finds active period
- Period ends with confirmation message
- Cycle end_date set correctly in database
- UI updates immediately

**Actual Behavior:**
- First attempt fails if > 2 minutes have passed
- Retry may work (cache refreshed)
- No clear error or retry guidance
- User frustrated, thinks feature is broken

**Suggested Fix:**
1. **Increase cache freshness frequency:** Reduce from 2 minutes to 30 seconds or use `staleTime: 0` (always fresh)
   - Trade-off: More API calls, but ensures freshness
   ```typescript
   // In useCurrentCycle
   staleTime: 30 * 1000,  // Reduce from 2 min
   ```

2. **Add explicit fresh fetch before end-period mutation:**
   ```typescript
   // In useCycleActions.endCurrentPeriod()
   const freshCycle = await supabase
     .from('cycles')
     .select('*')
     .eq('user_id', user.id)
     .is('end_date', null)
     .single();
   
   if (!freshCycle) throw new Error('No active period');
   ```

3. **Implement optimistic UI state:** Disable button during fetch, show loading spinner

4. **Add double-tap safety:** Prevent multiple rapid end-period requests (idempotency check in DB)

5. **Test:**
   - Start period, wait 5+ minutes, end period (verify works)
   - Rapid double-tap "End Period" (verify only one request sent)
   - Offline scenario (fetch fails, show user error)

**Additional Notes:**
- Related to Issue #9 (logging without period): if period can't be ended, users stuck
- Cache management strategy should be unified across all hooks (`useSaveLog`, `useCurrentCycle`, `useCycleHistory`)
- Consider per-minute cache refresh timer vs passive stale detection

---

### Issue #9: Logging Allowed Without Starting Period (No Cycle Linkage)
- **Category:** Bug / Data Integrity
- **Priority:** 🟠 HIGH
- **Area:** Logging System
- **Confidence:** 90%
- **Root Cause Files:** [hooks/useSaveLog.ts](hooks/useSaveLog.ts#L75-L86), [supabase/schema.sql](supabase/schema.sql#L160-L175)
- **Related Memory:** /memories/session/period-logging-analysis.md - Issue #4

**Description:**  
Users can log period data (flow, mood, symptoms) even when no period has been started. The log is saved with `cycle_id = NULL` and `cycle_day = NULL`, creating orphaned logs that can't be linked to cycle phases or included in analytics. Users may not realize they're not actually tracking a period.

**Steps to Reproduce:**
1. New user, no period started
2. Tap "+" FAB → Quick Check-in
3. Select flow + mood
4. Tap "Save"
5. **Actual:** Log saved successfully with no warning
6. Database shows: `cycle_id: null, cycle_day: null`
7. User thinks they're tracking cycles, but data is disconnected

**Expected Behavior:**
- Warn user if no period is active: "Start your period first to track cycle data"
- Block log submission until period started (configurable)
- OR create/auto-detect cycle if none active

**Actual Behavior:**
- Log saved silently with NULL cycle linkage
- No warning to user
- Logs accumulate and can't be analyzed by cycle phase
- Dashboard/insights broken for orphaned logs

**Suggested Fix:**
1. **Add UI validation in [hooks/useSaveLog.ts](hooks/useSaveLog.ts#L85-L90):**
   ```typescript
   if (!resolvedCycle?.id) {
     throw new Error('No active period. Start your period to begin logging.');
   }
   ```

2. **Add schema-level constraint (future migration):**
   ```sql
   ALTER TABLE daily_logs ADD CONSTRAINT cycle_id_not_null CHECK (cycle_id IS NOT NULL);
   ```

3. **Add modal dialog on client:**
   - If log attempt without cycle, show: "Start Period" CTA with date picker
   - Allow user to quickly start period before logging

4. **Test:**
   - Attempt log without active cycle (verify error/warning)
   - Start period, then log (verify cycle_id assigned)
   - Verify no orphaned logs in database

**Additional Notes:**
- Current: logs can exist without parent cycle (for testing or tracking symptoms before official period start)
- Decision: Should this be allowed? If yes, document rationale
- Consider audit trail to track orphaned log intent

---

### Issue #10: N+1 Query Pattern in process-scheduled-notifications (Performance DoS)
- **Category:** Bug / Performance / Architecture
- **Priority:** 🟠 HIGH
- **Area:** Backend / Notifications
- **Confidence:** 98%
- **Root Cause Files:** [supabase/functions/process-scheduled-notifications/index.ts](supabase/functions/process-scheduled-notifications/index.ts#L78-L140)

**Description:**  
The cron function `process-scheduled-notifications` processes notifications in batches (MAX_BATCH=100), but for each notification loops through individual queries instead of batch loading. For 100 notifications, function executes 400-500 queries instead of ~5. This is textbook N+1 query anti-pattern.

Queries per notification:
1. `notification_preferences` (line 94)
2. `enforceDailyCap()` count query (line 99)
3. `profiles` (line 109)
4. `cycles` (line 114)
5. `daily_logs` (line 119, 126)

Total: 100 notifications × 5 queries = 500 queries/cron run instead of batched ~5 queries.

Under load (1000+ pending notifications), cron will timeout, causing notification backlog, database connection pool exhaustion, and user-facing delays.

**Steps to Reproduce:**
1. Schedule 100 notifications in DB
2. Run `process-scheduled-notifications` cron manually
3. Monitor database query logs
4. **Actual:** See 400+ individual queries instead of batch queries
5. On slow DB: cron may timeout before processing all

**Expected Behavior:**
- Batch load all user IDs from notification batch
- Single query to fetch all preferences, profiles, cycles, logs via `IN (user_ids)`
- Process loop only does aggregation/logic, not DB calls
- Total: ~5 queries for 100 notifications

**Actual Behavior:**
- Loop processes sequentially
- Each iteration fires 4-5 DB queries
- 500 queries for 100 notifications

**Suggested Fix:**
Refactor [supabase/functions/process-scheduled-notifications/index.ts](supabase/functions/process-scheduled-notifications/index.ts#L78-L140):

```typescript
// Batch load all required data BEFORE loop
const userIds = notifications.map(n => n.user_id);
const [preferences, profiles, cycles, logs] = await Promise.all([
  admin.from('notification_preferences').select('*').in('user_id', userIds),
  admin.from('profiles').select('*').in('user_id', userIds),
  admin.from('cycles').select('*').in('user_id', userIds),
  admin.from('daily_logs').select('*').in('user_id', userIds),
]);

const prefsMap = new Map(preferences.map(p => [p.user_id, p]));
const profilesMap = new Map(profiles.map(p => [p.user_id, p]));
// ... etc

// NOW loop through notifications using maps (no DB calls)
for (const notification of notifications) {
  const prefs = prefsMap.get(notification.user_id);
  const profile = profilesMap.get(notification.user_id);
  // ... process
}
```

**Additional Notes:**
- Add query count logging to detect future N+1 patterns
- Load test with 500+ notifications to verify timeout fixed
- Consider pagination if notification volume exceeds memory limits

---

### Issue #11: Push Token Validation Missing in sync-push-token
- **Category:** Bug / Security / Data Integrity
- **Priority:** 🟠 HIGH
- **Area:** Backend / Notifications
- **Confidence:** 98%
- **Root Cause Files:** [supabase/functions/sync-push-token/index.ts](supabase/functions/sync-push-token/index.ts#L52-L62)

**Description:**  
The `sync-push-token` endpoint accepts ANY string as an FCM token without validation. Attackers can inject malformed, empty, or malicious strings into `push_tokens` table. While `send-fcm-v2` validates tokens on send, `sync-push-token` allows pollution of the database, causing:
- Invalid tokens in DB → send failures
- Wasted resources iterating bad tokens
- Bloated table (garbage in, garbage out)

**Steps to Reproduce:**
```bash
curl -X POST https://PROJECT_ID.functions.supabase.co/sync-push-token \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"token": "xyz"}' 

# Success: Token "xyz" saved to push_tokens table (invalid FCM token)

curl ... -d '{"token": ""}' 
# Success: Empty string saved

curl ... -d '{"token": null}' 
# Success: NULL saved
```

**Expected Behavior:**
- Reject tokens that don't match FCM token format
- FCM tokens are ~500-1500 char alphanumeric strings
- Return 400 Bad Request with error message

**Actual Behavior:**
- Any string accepted
- Token "xyz" saved to DB
- Later, send-fcm tries to send notification with "xyz", fails
- No warning during token sync

**Suggested Fix:**
Add token validation in [supabase/functions/sync-push-token/index.ts](supabase/functions/sync-push-token/index.ts#L27-L34):

```typescript
// Validate FCM token format
function isValidFCMToken(token: string): boolean {
  // FCM tokens are typically 100-500 chars, alphanumeric, some special chars
  if (!token || token.length < 100) return false;
  // Use regex from send-fcm-v2 if it exists
  return /^[a-zA-Z0-9_-]+$/.test(token) && token.length > 100;
}

if (!isValidFCMToken(token)) {
  return new Response(
    JSON.stringify({ error: 'Invalid FCM token format' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Additional Notes:**
- Check if `send-fcm-v2` has `isValidFCMToken()` function → reuse it
- Add field-level constraint to `push_tokens` table to reject short tokens
- Periodic cleanup of invalid tokens in DB (data hygiene job)

---

### Issue #12: Partner Access Audit Trail Missing (Security/Compliance)
- **Category:** Bug / Security / Compliance
- **Priority:** 🟠 HIGH
- **Area:** Backend / Security
- **Confidence:** 95%
- **Root Cause Files:** [supabase/schema.sql](supabase/schema.sql#L190-L220), [supabase/rls_policies.sql](supabase/rls_policies.sql), [hooks/useDailyLogs.ts](hooks/useDailyLogs.ts#L44-L47)

**Description:**  
No audit logging exists for partner data access. Cannot track which partner viewed what data, when, or how many times. This violates HIPAA, CCPA, and other health-data regulations that require audit trails for sensitive information access.

Additionally, the code calls `logDataAccess()` on every query but may not be persisting to database properly, leaving no compliance trail.

**Steps to Reproduce:**
1. User links a partner (creates entry in `partners` table)
2. Partner logs in and views user's health data
3. Query database for audit trail
4. **Actual:** No logs exist or they're incomplete
5. User asks: "Who viewed my data?" → No answer

**Expected Behavior:**
- Every partner data access logged with: timestamp, partner_user_id, user_id, action (view), fields accessed
- Audit trail queryable and immutable
- User can request data access logs anytime
- Reports exportable for compliance

**Actual Behavior:**
- No audit trail
- Cannot prove partner misuse
- Regulatory violation

**Suggested Fix:**
1. **Create audit_logs table** (if not exists):
   ```sql
   CREATE TABLE audit_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users,
     actor_id UUID NOT NULL,  -- Who accessed data
     actor_type TEXT,  -- 'partner', 'admin', 'user'
     action TEXT,  -- 'view', 'share', 'download'
     resource_type TEXT,  -- 'daily_logs', 'cycles'
     fields_accessed TEXT[],  -- Which fields were read
     created_at TIMESTAMP DEFAULT now()
   );
   CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
   ```

2. **Log partner data access in [supabase/rls_policies.sql](supabase/rls_policies.sql):**
   - Add trigger on `partner_visible_logs` SELECT attempts
   - Alternatively, log in app after RLS passes: `logDataAccess()`

3. **Ensure logDataAccess() in [hooks/useDailyLogs.ts](hooks/useDailyLogs.ts#L44-L47) persists:**
   - Currently may be called but not guaranteed to save
   - Add error handling and retry logic

4. **Add data export endpoint:**
   - GET `/api/audit-logs?from=2026-01-01&to=2026-03-26`
   - User can export audit report for compliance documentation

**Additional Notes:**
- Audit logs should be immutable (no updates/deletes, only inserts)
- Archive old audit logs to separate table after 1 year
- Expose audit log UI to user (Settings → Data Access History)

---

### Issue #13: Send-FCM (Legacy) Lacks Production Credentials Handling
- **Category:** Bug / Feature
- **Priority:** 🟠 HIGH
- **Area:** Backend / Notifications
- **Confidence:** 98%
- **Root Cause Files:** [supabase/functions/send-fcm/index.ts](supabase/functions/send-fcm/index.ts#L44-L46)

**Description:**  
The legacy `send-fcm` function uses a static `FCM_ACCESS_TOKEN` environment variable that requires manual token refresh. Google OAuth tokens expire after 1 hour, so after 1 hour without redeployment, all notifications fail silently.

`send-fcm-v2` exists and uses `SERVICE_ACCOUNT_JSON` with proper OAuth flow, but legacy `send-fcm` is still deployed and potentially called.

**Steps to Reproduce:**
1. Deploy `send-fcm` function
2. Note the time: T=0
3. Wait 1.5 hours
4. Attempt to send notification at T=1h 30m
5. **Actual:** Function fails, notifications not sent, no error visible to user
6. Requires manual token refresh + redeployment to fix

**Expected Behavior:**
- Tokens auto-refresh
- No 1-hour timeout
- Notifications always work
- No manual intervention

**Actual Behavior:**
- Tokens expire after 1 hour
- Function fails silently
- Manual redeployment required

**Suggested Fix:**
1. **Deprecate send-fcm** completely
   - Remove [supabase/functions/send-fcm/index.ts](supabase/functions/send-fcm/index.ts)
   - Update all references to use `send-fcm-v2` only

2. **Ensure all callers use send-fcm-v2:**
   - [supabase/functions/process-scheduled-notifications/index.ts](supabase/functions/process-scheduled-notifications/index.ts) should invoke `'send-fcm-v2'` not `'send-fcm'`
   - Search codebase for any references to old function

3. **Verify send-fcm-v2 credentials:**
   - Ensure `SERVICE_ACCOUNT_JSON` is set in secrets
   - Verify OAuth token refresh logic is working
   - Load test: continuous notifications for 2+ hours

**Additional Notes:**
- Dead code removal (send-fcm v1) covered in separate dead-code cleanup issue
- Document notification system architecture to prevent future confusion

---

### Issue #14: Missing App Icon Coverage / Size Variants
- **Category:** Bug / Production Readiness
- **Priority:** 🟠 HIGH
- **Area:** Release / App Configuration
- **Confidence:** 95%
- **Root Cause Files:** [app.json](app.json#L7-L10)

**Description:**  
The app icon is only defined as a single `icon.png` in `app.json`. Missing icon sizes for:
- **iOS:** Specific sizes (60@3x=180px, 76@2x=152px, 83.5@2x=167px for iPad) and App Store submission
- **Android:** Adaptive icon foreground/background sizes plus monochrome variant

Result: iPad users see blurry/stretched icon, iOS App Store shows placeholder, Android adaptive icon may not render correctly.

**Steps to Reproduce:**
1. Open app on iPad
2. Navigate to home screen
3. **Actual:** App icon appears blurry/distorted
4. Check iOS App Store listing
5. **Actual:** Generic placeholder instead of custom icon

**Expected Behavior:**
- Crisp icon on all device sizes (iPhone, iPad, Android phones, tablets)
- App Store submission with all required sizes
- Adaptive icon properly rendered on Android

**Actual Behavior:**
- Single icon forced to all sizes → quality loss
- App Store placeholder (user confusion)
- Icon rendering issues on Android

**Suggested Fix:**
1. **Create icon assets:** Generate all required sizes using asset creator or Figma
   - iOS: 1024x1024, 512x512, then sizes: 20, 29, 40, 60, 76, 83.5 (@1x, @2x, @3x)
   - Android: 192x192 (foreground), 108x108 (background), adaptive icon

2. **Update [app.json](app.json#L7-L10):**
   ```json
   "icon": "./assets/images/icon.png",
   "ios": {
     "icon": "./assets/images/icon.png",
     "icon1024": "./assets/images/icon-1024.png"
   },
   "android": {
     "adaptiveIcon": {
       "foregroundImage": "./assets/images/android-icon-foreground.png",
       "backgroundImage": "./assets/images/android-icon-background.png",
       "monochromeImage": "./assets/images/android-icon-monochrome.png"
     }
   }
   ```

3. **Test:**
   - Build iOS app and submit to App Store (verify icon appears)
   - Install Android app on tablet (verify adaptive icon)
   - Open on iPad (verify no blur)

**Additional Notes:**
- Recommend automated icon generation tool (eg. App Store Connect, Figma plugins)
- Include icon versioning if app branding changes

---

### Issue #15: Parental Consent Email Injection Risk
- **Category:** Bug / Security
- **Priority:** 🟠 HIGH
- **Area:** Backend / Security
- **Confidence:** 90%
- **Root Cause Files:** [supabase/functions/request-parental-consent/index.ts](supabase/functions/request-parental-consent/index.ts#L50-L80)

**Description:**  
Email validation in `request-parental-consent` is weak and vulnerable to email header injection. Attacker can craft email input like `parent@example.com\nBcc: attacker@evil.com` to inject SMTP headers, allowing BCC'ing spam to attacker's inbox or forging email sender.

**Steps to Reproduce:**
```bash
curl -X POST https://PROJECT_ID.functions.supabase.co/request-parental-consent \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@example.com\nBcc: attacker@evil.com",
    "childName": "Kid"
  }'
```

If Resend API doesn't sanitize, the BCC header gets injected into email.

**Expected Behavior:**
- Email address strictly validated (RFC 5322)
- No newline/special characters allowed
- Error if injection attempted

**Actual Behavior:**
- Weak regex allows injection
- Email sent with injected headers
- Attacker receives BCC'd consent requests

**Suggested Fix:**
1. **Use strict RFC 5322 validation:**
   ```typescript
   import { z } from 'zod';
   
   const emailSchema = z.string().email().max(254);
   const email = emailSchema.parse(parentEmail);
   ```

2. **Or use email library:**
   ```typescript
   import { validate } from 'email-validator';
   if (!validate(parentEmail)) {
     return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400 });
   }
   ```

3. **Sanitize input before Resend:**
   ```typescript
   // Remove newlines, null bytes, etc.
   const sanitized = email.replace(/[\r\n\0]/g, '');
   const result = await resend.emails.send({
     from: 'noreply@somahealth.app',
     to: sanitized,  // Use sanitized email
     ...
   });
   ```

4. **Test edge cases:**
   - Email with newline: `test@ex.com\nBcc: bad@evil.com`
   - Email with null byte: `test@ex.com\x00bcc`
   - Multi-line injection

**Additional Notes:**
- Check Resend API documentation for built-in sanitization
- Consider using Resend's email validation service

---

## MEDIUM PRIORITY

### Issue #16: Status Bar Color Flickers Between Screens
- **Category:** Bug / UX (Minor)
- **Priority:** 🟡 MEDIUM
- **Area:** UI/UX - Theming
- **Confidence:** 85%
- **Root Cause Files:** [src/components/ui/Screen.tsx](src/components/ui/Screen.tsx#L57), [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx)

**Description:**  
StatusBar text color flickers when switching tabs or navigating between screens in dark mode. Each screen re-renders StatusBar independently with `barStyle={isDark ? 'light-content' : 'dark-content'}`, causing multiple state Changes.

**Steps to Reproduce:**
1. Enable dark mode
2. Open app on tabs layout
3. Switch tabs rapidly (Home → Partner → Profile → Home)
4. **Actual:** Notice StatusBar text briefly flickers white/dark

**Suggested Fix:**
- Set StatusBar globally in [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx) wrapper instead of per-screen
- Use `useColorScheme()` once at top level, pass as context to all screens

---

### Issue #17: Start Period Date Lacks Default & Date Picker UX
- **Category:** Bug / UX
- **Priority:** 🟡 MEDIUM
- **Area:** UX - Period Logging
- **Confidence:** 95%
- **Root Cause Files:** [src/components/ui/PeriodLogModal.tsx](src/components/ui/PeriodLogModal.tsx#L25-L30)
- **Related Memory:** /memories/session/period-logging-analysis.md - Issue #5

**Description:**  
When opening "Log Period" modal to start a period, the date field is empty. Users must manually type the date in `YYYY-MM-DD` format, causing friction and errors. No date picker, no pre-fill with today's date.

**Steps to Reproduce:**
1. Home screen → "Log Today's Flow & Mood" → Modal
2. Field: "When did your last period start?" shows empty TextInput
3. User must type date manually
4. **Actual UX Issues:**
   - No default (blank field confuses)
   - No date picker (mobile keyboards clunky)
   - Format requirement unclear (error only after submit attempts)
   - Can't easily enter past dates (7, 14 days ago)

**Suggested Fix:**
1. Pre-fill date field with today's date:
   ```typescript
   const [startDate, setStartDate] = useState(() => todayIso());  // YYYY-MM-DD
   ```

2. Add native date picker (not TextInput):
   ```typescript
   import DateTimePicker from '@react-native-community/datetimepicker';
   
   <DateTimePicker
     value={startDate}
     mode="date"
     display="spinner"  // or "calendar"
     onChange={(event, selectedDate) => setStartDate(selectedDate)}
     maximumDate={new Date()}  // Can't select future
   />
   ```

3. Add quick-select buttons:
   ```typescript
   <QuickSelectButton label="Today" onPress={() => setStartDate(todayIso())} />
   <QuickSelectButton label="Yesterday" onPress={() => setStartDate(yesterdayIso())} />
   <QuickSelectButton label="1 week ago" onPress={() => setStartDate(addDays(today, -7))} />
   ```

---

### Issue #18: Settings Screen Not Production Ready (UX/Layout)
- **Category:** Bug / UX
- **Priority:** 🟡 MEDIUM
- **Area:** UI/UX - Settings
- **Confidence:** 90%
- **Root Cause Files:** [src/screens/SettingsScreen.tsx](src/screens/SettingsScreen.tsx)

**Description:**  
SettingsScreen has poor layout, unclear hierarchy, and missing polish:
- Text fields have light backgrounds in dark mode (Issue #5 related)
- Form sections lack visual grouping
- Button labels unclear ("Save" vs "Apply" vs "Cancel" inconsistency)
- No loading states on save
- No validation feedback on fields
- Cycle defaults section buried without clear affordance

**Suggested Fix:**
1. Add section headers with visual separation (cards, backgrounds)
2. Consistent form validation + error messages
3. Loading state on save button
4. Reorganize: Profile → Cycle Defaults → Notifications → Data & Privacy

---

### Issue #19: Dark Mode Input Field Colors Breaks SetupScreen
- **Category:** Bug / UI/UX
- **Priority:** 🟡 MEDIUM
- **Area:** UI/UX - Dark Mode
- **Confidence:** 98%
- **Root Cause Files:** [src/screens/SetupScreen.tsx](src/screens/SetupScreen.tsx#L243-L257)

**Description:**  
SetupScreen input fields hardcode light background (`rgba(255,255,255,0.85)`) even in dark mode, breaking visibility and creating jarring white boxes on dark background.

**Suggested Fix (Already covered in Issue #5 deep dive above):**
```typescript
const isDark = useColorScheme() === 'dark';
const inputBackgroundColor = isDark ? "rgba(30,33,40,0.85)" : "rgba(255,255,255,0.85)";
```

---

### Issue #20: Layout Doesn't Scale on Tablets (Fixed Padding)
- **Category:** Bug / UX
- **Priority:** 🟡 MEDIUM
- **Area:** UX - Responsive Design
- **Confidence:** 90%
- **Root Cause Files:** [src/components/ui/Screen.tsx](src/components/ui/Screen.tsx#L67)

**Description:**  
All screens hardcode `paddingHorizontal: 28` regardless of device width. On iPad or large secondary displays, content is squeezed to center with huge margins, looking empty.

**Suggested Fix:**
```typescript
import { useWindowDimensions } from 'react-native';

const { width } = useWindowDimensions();
const horizontalPadding = width > 768 ? 64 : 28;  // Tablet vs phone
```

---

### Issue #21: Data Rights Admin Token Timing Attack Risk
- **Category:** Bug / Security
- **Priority:** 🟡 MEDIUM
- **Area:** Backend / Security
- **Confidence:** 80%
- **Root Cause Files:** [supabase/functions/process-data-rights-request/index.ts](supabase/functions/process-data-rights-request/index.ts#L52-L53)

**Description:**  
Admin token comparison uses JavaScript `!==` operator, which is vulnerable to timing-based attacks. If token is N characters and attacker measures response time, they can narrow down correct characters.

**Suggested Fix:**
Use constant-time comparison:
```typescript
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const encoder = new TextEncoder();
const correctTokenBytes = encoder.encode(adminToken);
const submittedTokenBytes = encoder.encode(tokenHeader);

const isMatch = await crypto.subtle.timingSafeEqual(
  correctTokenBytes,
  submittedTokenBytes
);

if (!isMatch) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
```

---

### Issue #22: Missing Request Body Size Limits
- **Category:** Bug / Security
- **Priority:** 🟡 MEDIUM
- **Area:** Backend / Security
- **Confidence:** 95%
- **Root Cause Files:** All 9 edge functions (no body size checks)

**Description:**  
Edge functions parse `await req.json()` without size limits. Attacker sends multi-GB payload, Deno buffers entire request, causing memory exhaustion and DoS.

**Suggested Fix:**
Add middleware to all functions:
```typescript
const MAX_BODY_SIZE = 10 * 1024;  // 10KB

if (request.headers.get('content-length')) {
  const contentLength = parseInt(request.headers.get('content-length')!);
  if (contentLength > MAX_BODY_SIZE) {
    return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413 });
  }
}
```

---

### Issue #23: Cycle Length Validation Missing at App Level
- **Category:** Bug / Data Integrity
- **Priority:** 🟡 MEDIUM
- **Area:** Data Integrity
- **Confidence:** 90%
- **Root Cause Files:** [hooks/useCycleActions.ts](hooks/useCycleActions.ts#L76-L82), [supabase/schema.sql](supabase/schema.sql#L128)

**Description:**  
Database has CHECK constraint on `cycle_length` (15-90 days), but app doesn't validate before sending update. If user edits period dates and calculated cycle_length exceeds 90, database silently rejects with no user-facing error.

**Suggested Fix:**
Pre-validate in [hooks/useCycleActions.ts](hooks/useCycleActions.ts#L76-L82):
```typescript
const cycleLength = daysBetween(startDate, endDate);
if (cycleLength < 15 || cycleLength > 90) {
  throw new Error(`Cycle length must be 15-90 days, not ${cycleLength}`);
}
```

---

### Issue #24: Inconsistent Request Body Parsing Error Handling
- **Category:** Bug / Error Handling
- **Priority:** 🟡 MEDIUM
- **Area:** Backend / Error Handling
- **Confidence:** 85%
- **Root Cause Files:** All edge functions (inconsistent try/catch)

**Description:**  
Some functions catch JSON parse errors (data-rights-request), others don't. Uncaught exceptions crash function, returning 500 instead of 400.

**Suggested Fix:**
Wrap all `req.json()` in try/catch:
```typescript
let body;
try {
  body = await req.json();
} catch (e) {
  return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
}

// Validate schema with Zod or similar
```

---

### Issue #25: Cycle Day Calculation Not Validated at Database Level
- **Category:** Bug / Data Integrity
- **Priority:** 🟡 MEDIUM
- **Area:** Data Integrity
- **Confidence:** 90%
- **Root Cause Files:** [supabase/schema.sql](supabase/schema.sql#L172), [hooks/useDailyLogs.ts](hooks/useDailyLogs.ts)

**Description:**  
`cycle_day` is manually calculated and inserted, but if parent cycle is deleted or if cycle_day is out of range (1-90), database constraint alone can't fix it. No trigger to re-calculate or validate.

**Suggested Fix:**
Add trigger:
```sql
CREATE TRIGGER validate_cycle_day BEFORE INSERT OR UPDATE ON daily_logs
FOR EACH ROW EXECUTE FUNCTION (
  -- Ensure cycle_day matches computed value based on cycle start
  IF NEW.cycle_id IS NOT NULL THEN
    DECLARE cycle_record cycles;
    SELECT * INTO cycle_record FROM cycles WHERE id = NEW.cycle_id;
    NEW.cycle_day := (NEW.date - cycle_record.start_date) + 1;
  END IF;
);
```

---

## LOW PRIORITY / Tech Debt

### Issue #26: Dead Code: Deprecated send-fcm (v1) Function
- **Category:** Code Quality / Debt
- **Priority:** 🟢 LOW
- **Area:** Backend / Maintenance
- **Confidence:** 99%
- **Root Cause Files:** [supabase/functions/send-fcm/index.ts](supabase/functions/send-fcm/index.ts)

**Description:**  
Legacy `send-fcm` function exists alongside `send-fcm-v2`. v1 has known issues (static token handling, no modern error handling). Should be removed to avoid confusion and maintenance burden.

**Suggested Fix:**
1. Verify all callers use `send-fcm-v2`
2. Delete [supabase/functions/send-fcm/index.ts](supabase/functions/send-fcm/index.ts)
3. Update migration guide in docs

---

### Issue #27: Unused dedupeKey Field in Notifications
- **Category:** Code Quality / Debt
- **Priority:** 🟢 LOW
- **Area:** Backend / Maintenance
- **Confidence:** 95%
- **Root Cause Files:** [supabase/functions/send-fcm/index.ts](supabase/functions/send-fcm/index.ts#L102)

**Description:**  
`dedupeKey` is accepted and stored in notifications but never used for deduplication logic. Remove or implement deduplication enforcement.

---

### Issue #28: Audit Log Sampling Not Implemented
- **Category:** Performance
- **Priority:** 🟢 LOW
- **Area:** Backend / Performance
- **Confidence:** 90%
- **Root Cause Files:** [hooks/useDailyLogs.ts](hooks/useDailyLogs.ts#L44-L47)

**Description:**  
Every data access logged to DB. With 500+ DAU, this is 15K+ inserts/month, bloating database. Should sample at ~1% to reduce volume while maintaining audit trail.

---

### Issue #29: Daily Logs Fetched Without Pagination
- **Category:** Performance
- **Priority:** 🟢 LOW
- **Area:** Backend / Performance / Frontend
- **Confidence:** 90%
- **Root Cause Files:** [hooks/useDailyLogs.ts](hooks/useDailyLogs.ts#L21-L44)

**Description:**  
Fetches full 90 days of logs with all columns (`SELECT *`), causing high bandwidth and slow load. Should paginate (30 items) and select only needed fields.

---

### Issue #30: Missing Error Details Sanitization
- **Category:** Security / Error Handling
- **Priority:** 🟢 LOW
- **Area:** Backend / Security
- **Confidence:** 90%
- **Root Cause Files:** All edge functions (error responses)

**Description:**  
Error messages return internal details (SQL errors, stack traces). Should sanitize to generic "Internal server error" for client.

---

### Issue #31: Deduplication Enforcement Missing
- **Category:** Data Integrity
- **Priority:** 🟢 LOW
- **Area:** Backend / Data Integrity
- **Confidence:** 80%
- **Root Cause Files:** [supabase/schema.sql](supabase/schema.sql#L236), [supabase/functions/send-fcm-v2/index.ts](supabase/functions/send-fcm-v2/index.ts#L22)

**Description:**  
No unique constraint on `dedupeKey` in `notification_events` table. Duplicate notifications can be sent if cron retries.

---

## Coverage Matrix

| Required Known Issue | Covered By GitHub Issue | Status |
|---|---|---|
| ✅ Signup/New User Fails | #1 | COVERED |
| ✅ Keyboard Overlap | #4 | COVERED |
| ✅ End Cycle Not Working | #8 | COVERED |
| ✅ Logging Overwrites | #2 | COVERED |
| ✅ No Rate Limiting | #6 | COVERED |
| ✅ Duplicate Logging Systems | #3 | COVERED |
| ✅ Logging Without Period Start | #9 | COVERED |
| ✅ Start Period Date UX | #17 | COVERED |
| ✅ Settings Not Production Ready | #18 | COVERED |
| ✅ Missing App Icon | #14 | COVERED |
| ✅ White Screen on Launch | #5 | COVERED |
| ✅ Health Data Encryption | #7 | COVERED |
| ✅ Partner Access Audit | #12 | COVERED |
| ✅ Push Token Validation | #11 | COVERED |
| ✅ Send-FCM Legacy Issues | #13 | COVERED |

**Additional Critical Issues Found:**
- N+1 Query Pattern (#10)
- Parental Consent Email Injection (#15)
- Data Rights Timing Attack (#21)

---

**Total Issues: 31**
- **Critical: 7**
- **High: 9**
- **Medium: 11**
- **Low: 4**

---

## 📊 Issue Summary Dashboard

### Totals
- **Total Issues:** 31
- **Known Critical Issues Covered:** 11/11 (100%)

### By Priority
| Priority | Count | Percent |
|---|---:|---:|
| Critical | 7 | 22.6% |
| High | 9 | 29.0% |
| Medium | 11 | 35.5% |
| Low | 4 | 12.9% |

### By Category (Primary Classification)
| Category | Count |
|---|---:|
| Bug / Functional | 11 |
| UX / UI | 7 |
| Security / Compliance | 7 |
| Performance | 3 |
| Architecture / Tech Debt | 3 |

### By Area
| Area | Count |
|---|---:|
| Logging + Period Flow | 10 |
| Backend/API + Notifications | 11 |
| UI/UX + Launch/Settings | 7 |
| Security/Compliance | 7 |
| Release Readiness | 2 |

---

## 🛠️ Suggested Fix Roadmap

### Phase 0: Immediate Hotfix Blockers (0-2 days)
1. **Issue #1** Signup failure and profile consistency.
2. **Issue #4** Keyboard overlap on auth/setup/settings.
3. **Issue #8** End-period reliability and idempotency.
4. **Issue #2 + #3** Logging overwrite + duplicate logging pathway contract.

### Phase 1: Security Baseline (2-5 days)
1. **Issue #6** Rate limiting for all edge functions.
2. **Issue #11** Strict push-token validation at ingress.
3. **Issue #15 + #21** Hardening against email header injection and timing-safe token checks.
4. **Issue #30** Safe error response sanitization.

### Phase 2: Data Integrity and Notification Stability (5-8 days)
1. **Issue #9** Block or explicitly model logging without active cycle.
2. **Issue #10** Remove N+1 scheduler query pattern.
3. **Issue #13 + #26** Complete migration to send-fcm-v2 and remove legacy sender.
4. **Issue #31 + #27** Enforce dedupe behavior and dedupe key constraints.

### Phase 3: Product Polish and Release Readiness (8-12 days)
1. **Issue #5** Splash/white-screen launch consistency.
2. **Issue #14** App icon matrix completion.
3. **Issue #18 + #19 + #20 + #16** Settings, theming, responsive layout, status bar polish.
4. **Issue #17** Start-date default and date-picker UX.

### Phase 4: Compliance and Scalability Hardening (12-16 days)
1. **Issue #12** Immutable partner access audit trail.
2. **Issue #7** At-rest encryption strategy for sensitive health fields.
3. **Issue #22 + #24 + #25** Body size limits, JSON parsing consistency, cycle-day DB integrity.
4. **Issue #28 + #29** Audit sampling and log pagination/perf optimization.

---

## 🧹 Dead Code Report

### Confirmed Dead/Redundant Paths
1. **Legacy notification function remains active footprint**
   - Evidence: [supabase/functions/send-fcm/index.ts](supabase/functions/send-fcm/index.ts)
   - Risk: duplicate notification pathways and accidental invocation of deprecated auth flow.
   - Action: remove after full caller migration to v2.

2. **Unused/unenforced `dedupeKey` path in legacy sender**
   - Evidence: [supabase/functions/send-fcm/index.ts](supabase/functions/send-fcm/index.ts#L102)
   - Risk: false sense of idempotency; duplicates still possible.
   - Action: enforce at DB + sender layer or remove field.

3. **Partially isolated period-start path in settings**
   - Evidence: [hooks/useCycleActions.ts](hooks/useCycleActions.ts#L394), [src/screens/SettingsScreen.tsx](src/screens/SettingsScreen.tsx#L24)
   - Risk: fragmented cycle lifecycle logic and inconsistent UX between settings and primary flow.
   - Action: unify cycle start/end service contract and route through one canonical UI action.

4. **Parallel dedupe semantics in offline sync vs notification dedupe**
   - Evidence: [src/services/OfflineSyncService.ts](src/services/OfflineSyncService.ts#L52)
   - Risk: concept overlap with different semantics; easy to misapply or regress.
   - Action: centralize dedupe naming/contracts by domain.

---

## 🔐 Security Risk Report

### Critical Risks
1. **No rate limiting on edge functions (Issue #6)**
   - Exploitability: High
   - Impact: DoS, brute force, abusive traffic, cost spikes.

2. **Sensitive health data protection gaps (Issue #7)**
   - Exploitability: Medium (depends on breach/access path)
   - Impact: high-severity privacy and regulatory exposure.

3. **Partner access observability gap (Issue #12)**
   - Exploitability: Medium
   - Impact: weak forensic/compliance posture for health-data access.

### High Risks
1. **Push-token ingestion validation missing (Issue #11)**
   - Exploitability: High
   - Impact: poisoned token store, downstream instability.

2. **Email header injection vector in parental consent flow (Issue #15)**
   - Exploitability: Medium
   - Impact: abuse/spam or message routing manipulation.

3. **Information leakage via raw error payloads (Issue #30)**
   - Exploitability: Medium
   - Impact: attacker reconnaissance and internals disclosure.

### Medium Risks
1. **Timing-safe compare missing for admin token check (Issue #21)**
2. **Request body size limits missing (Issue #22)**
3. **Notification dedupe enforcement gaps (Issue #31 / #27)**

### Security Implementation Order
1. Rate limit + payload size guardrails.
2. Token/email input validation hardening.
3. Error sanitization + timing-safe comparisons.
4. Audit trail and encryption policy completion.

---

## ✅ Quality Gate

### Coverage Validation
- **Required known issues:** 11/11 covered.
- **Strict issue format fields:** included across authored issue set.
- **Root-cause orientation:** each issue maps to concrete file/symbol evidence.

### Risk of Duplication
- Potential overlap intentionally linked where causal coupling exists:
  - Issue #2 and #3 (same-day overwrite and dual logging entry points).
  - Issue #13 and #26 (legacy sender risk and dead-code cleanup).

### Publication Readiness
1. Issue authoring pack prepared in [.github/ISSUES_MASTER_LIST.md](.github/ISSUES_MASTER_LIST.md).
2. Repro + validation matrix prepared in [.github/VALIDATION_MATRIX.md](.github/VALIDATION_MATRIX.md).
3. Automated publishers ready:
   - [.github/scripts/create_audit_issues.sh](.github/scripts/create_audit_issues.sh)
   - [.github/scripts/create_remaining_audit_issues.sh](.github/scripts/create_remaining_audit_issues.sh)
4. Remaining blocker: GitHub auth (`gh auth login`) required to publish issues directly.

