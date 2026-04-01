# Production Readiness Validation - Status Report

**Generated**: 27 March 2026  
**Current Status**: ⚠️ BLOCKED - Authentication Blockers Detected

---

## 🔴 CRITICAL BLOCKER: Invalid Supabase API Key

### Symptoms
```
AuthApiError: Invalid API key
Real DB test failed to sign in with test account: Invalid API key
```

### Root Causes (Choose One)
1. **API Key + URL Mismatch**: The SUPABASE_TEST_ANON_KEY does not belong to SUPABASE_TEST_URL
2. **Corrupted Key**: The key in .env.local is incomplete or malformed
3. **Project Configuration**: The Supabase project has auth restrictions that prevent email/password signin
4. **Rate Limiting or Account Restrictions**: The test user account is locked or suspended

---

## ✅ RESOLUTION STEPS

### Step 1: Verify Supabase Project Configuration

Visit [https://app.supabase.com](https://app.supabase.com):

1. **Select your test project**: `soma-test` or the project at `wqgprkhkbqcbokxstxrq.supabase.co`
2. Go to **Settings → API**
3. Compare values in `.env.local` with dashboard:
   ```
   SUPABASE_TEST_URL should match: Project URL
   SUPABASE_TEST_ANON_KEY should match: Anon / Public key (NOT service_role key!)
   ```

### Step 2: Create New Test Project (Recommended)

If keys are mismatched, create a dedicated test project:

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **"New project"**
   - Name: `soma-test-qa`
   - Region: Same as production (or preferred)
   - Database Password: Generate secure password
3. **Disable email confirmation** (for automated tests):
   - Dashboard → **Authentication → Policies**
   - Toggle OFF: "Confirm email"
4. **Clone schema from production** (if needed):
   ```bash
   supabase link --project-ref YOUR_NEW_TEST_PROJECT_REF
   supabase db push
   ```

### Step 3: Get Correct Credentials

From your **Supabase Dashboard → Settings → API**:

```bash
# Get these exact values:
- Project URL (looks like: https://xxxx.supabase.co)
- Anon / Public key (starts with: eyJ...)
  ⚠️ NOT service_role key! (that's for server-only)
```

### Step 4: Create Pre-Provisioned Test User

In **Supabase Dashboard → Authentication → Users**:

1. Click **"Add user"** → **"+ Create new user"**
2. **Email**: `deepakpandey911494@gmail.com` (or use your preferred test email)
3. **Password**: `Deepak1124@` (or your test password)
4. Uncheck: **"Auto send invitation email"**
5. Click **"Create user"**

### Step 5: Update .env.local

Replace values with what you just verified:

```bash
# From Dashboard → Settings → API
SUPABASE_TEST_URL=https://YOUR_PROJECT_REF_HERE.supabase.co
SUPABASE_TEST_ANON_KEY=eyJ... (your actual key from dashboard)
SUPABASE_TEST_USER_EMAIL=deepakpandey911494@gmail.com
SUPABASE_TEST_PASSWORD=Deepak1124@
```

### Step 6: Verify Configuration
```bash
# Check env vars load correctly
node -e "
require('dotenv').config({path: '.env.local'});
console.log('✓ URL:', process.env.SUPABASE_TEST_URL ? 'SET' : '❌ MISSING');
console.log('✓ Key:', process.env.SUPABASE_TEST_ANON_KEY ? 'SET' : '❌ MISSING');
console.log('✓ Email:', process.env.SUPABASE_TEST_USER_EMAIL ? 'SET' : '❌ MISSING');
console.log('✓ Password:', process.env.SUPABASE_TEST_PASSWORD ? 'SET' : '❌ MISSING');
"
```

### Step 7: Re-run Tests
```bash
npm run test:real-backend
```

---

## 📋 Environment Checklist

- [ ] Supabase test project created (not production)
- [ ] Email authentication enabled
- [ ] Email confirmation DISABLED (unchecked in Policies)
- [ ] Anonymous auth ENABLED (if using anonymous tests)
- [ ] Test user created manually
- [ ] .env.local has correct SUPABASE_TEST_* variables
- [ ] All 4 required vars set (URL, KEY, EMAIL, PASSWORD)
- [ ] API key matches project URL (no mismatches)

---

## 🔍 Debugging Commands

```bash
# Test authentication with curl (if you know the Supabase project)
curl -X POST https://YOUR_PROJECT_REF.supabase.co/auth/v1/token \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "email": "deepakpandey911494@gmail.com",
    "password": "Deepak1124@"
  }'

# Should return a JWT access_token if credentials are valid
# If it returns "Invalid API key", the key doesn't match the project
```

---

## 🚨 Common Mistakes

1. **Wrong API Key Type**: Using `service_role` instead of `anon` (WRONG!)
   - `service_role` is for server-only, disabled by default in client
   - Always use `Anon / Public` key for real tests

2. **URL + Key Mismatch**: Copying URL from one project and key from another
   - Both must come from the SAME Supabase project

3. **Corrupted Environment Variable**: Line breaks or quotes in .env.local
   - Should be single line: `SUPABASE_TEST_ANON_KEY=eyJ...`
   - Not multi-line JSON

4. **Test User Email Typo**: Slight difference between creation and .env.local
   - Double-check email matches exactly

---

## 📞 Still Stuck?

1. Visit Supabase docs: [https://supabase.com/docs](https://supabase.com/docs)
2. Check your project credentials match exactly
3. Verify email is in correct case (lowercase is standard)
4. Test credentials independently (use dashboard UI first)

Once fixed, re-run: `npm run test:real-backend`
