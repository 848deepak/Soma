# Real Backend Test Environment Setup

This guide ensures you have a fully isolated test environment for validating production-readiness with real Supabase infrastructure.

## ⚙️ PHASE 1: Dedicated Supabase Test Project Setup

### Option A: Recommended - Use a Separate Supabase Project

1. **Create a dedicated Supabase project** (not production):
   - Go to [app.supabase.com](https://app.supabase.com)
   - Click "New project" → Name it `soma-test` or `soma-qa`
   - Choose a region
   - Set a strong password
   - Record your credentials

2. **Configure Authentication**:
   - Dashboard → Authentication → Providers
   - ✅ Enable "Email" provider
   - Dashboard → Authentication → Policies
   - ✅ Disable "Email confirmation" (for automated testing)
   - ⚠️ If using anonymous auth: Enable "Anonymous" sign-ins

3. **Clone Production Schema** (if needed):
   ```bash
   # Use supabase CLI to clone schema
   supabase link --project-ref YOUR_TEST_PROJECT_REF
   supabase db push  # Requires migrations
   ```

### Option B: Use a Test Schema in Existing Project

Create a dedicated `test_*` schema in your project with test data isolation.

---

## 🔐 PHASE 2: Create Pre-Provisioned Test User

**DO NOT rely on signup in tests** - Use pre-created credentials.

### Step 1: Create Test User Manually

1. Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. **Email**: `qa-test-user@example.com`
4. **Password**: `SomaTest#12345` (or your choice, update config)
5. ✅ "Auto send invitation email" - uncheck (we disable email confirmation)
6. Click "Create user"

### Step 2: Verify Test User Works

```bash
# Test login manually in dashboard or run:
npm run test:real-backend
```

---

## 📋 PHASE 3: Environment Configuration

### Create `.env.local` with Test Credentials

```bash
# From your test Supabase project:
# Dashboard → Settings → API

SUPABASE_TEST_URL=https://YOUR_TEST_PROJECT_REF.supabase.co
SUPABASE_TEST_ANON_KEY=YOUR_TEST_ANON_KEY
SUPABASE_TEST_PASSWORD=SomaTest#12345
SUPABASE_TEST_USER_EMAIL=qa-test-user@example.com

# Optional features:
SUPABASE_TEST_ENABLE_REALTIME=false
SUPABASE_TEST_ENABLE_PARTNER_FLOW=false
```

### Verify Configuration

```bash
# Check env vars are loaded
node -e "require('dotenv').config({path: '.env.local'}); console.log(process.env.SUPABASE_TEST_URL)"
```

---

## 🧪 PHASE 4: Run Real Backend Tests

### All Tests

```bash
npm run test:real-backend
```

### Individual Tests

```bash
# Auth flow only
npm test -- __tests__/e2e/real-auth.e2e.test.ts

# Database operations
npm test -- __tests__/e2e/real-db.e2e.test.ts

# Full user flow
npm test -- __tests__/e2e/real-flow.e2e.test.ts
```

---

## ✅ Expected Results

### Successful Real Backend Test Run

```
Real Supabase Auth Flow
  ✓ signs up, logs in, verifies profile row, refreshes token, and signs out (2.3s)

Real Supabase DB Flow
  ✓ inserts, fetches, updates, and deletes real daily log rows (1.8s)
  ✓ subscribes to realtime updates when explicitly enabled (skipped - not enabled)
  ✓ remains consistent after delayed read windows (2.1s)

Real User Flow (Auth + Data)
  ✓ runs signup -> login -> session -> log write/read and optional partner step (2.0s)

Test Suites: 3 passed, 3 total
Tests:       5 passed, 5 total
Time:        8.5 s
```

---

## 🚨 Troubleshooting

### Error: "Missing Supabase backend credentials"
```
❌ SUPABASE_TEST_URL not found
```
**Fix**: Ensure `.env.local` has correct credentials from Supabase dashboard.

### Error: "email not confirmed"
```
❌ User must verify email before login
```
**Fix**: Dashboard → Authentication → Policies → Disable "Email confirmation"

### Error: "User not found"
```
❌ Test user does not exist in database
```
**Fix**: Create user manually (Step 1 above) or verify password is correct.

### Error: "Rate limited"
```
❌ Supabase email signup rate limit exceeded
```
**Fix**: Using pre-provisioned test user avoids signup (use SUPABASE_TEST_USER_EMAIL)

### Error: "Anonymous sign-ins disabled"
```
⚠️ Anonymous auth is disabled, using email auth instead
```
**Expected behavior**: Tests will use email/password credentials automatically.

---

## 🔄 Data Cleanup Strategy

Tests automatically **clean up test data** after each run:
- `clearUserDailyData()` removes daily_logs and cycles
- Uses unique user IDs per test session
- No residual data left behind

---

## 📊 Validation Checklist

- [ ] Dedicated Supabase test project created
- [ ] Email authentication enabled
- [ ] Email confirmation disabled
- [ ] Pre-provisioned test user created
- [ ] `.env.local` populated with test credentials
- [ ] `npm run test:real-backend` runs without errors
- [ ] All real backend tests pass
- [ ] No warnings or skipped validations
- [ ] Test user data cleaned up after run

---

## 🏁 When Tests Pass

Application is **PRODUCTION-READY** if:
- ✅ Real auth flows work consistently
- ✅ DB operations (insert/fetch/update/delete) are reliable
- ✅ Session persistence works
- ✅ No rate limit issues
- ✅ No environment warnings or fallbacks
- ✅ Tests run without skips or early returns

---

## 📺 Next Steps: Integration with Detox

Once real backend tests pass, run end-to-end app flow:

```bash
npm run ios  # or android
# Test manual user flow: Login → View data → Update data → Verify in DB
```

For full E2E automation, configure Detox to use real backend credentials.
