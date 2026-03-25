# FCM Integration Implementation Summary

## What Has Been Completed

### ✅ 1. Production-Grade FCM Client Library
**File:** `supabase/functions/_shared/fcm-client.ts`

A reusable, modular FCM integration module featuring:
- **Dynamic Token Generation**: Automatically generates OAuth access tokens from service account JSON
- **Token Caching**: Caches tokens for 1 hour with 5-minute safety buffer (prevents premature expiry)
- **HTTP v1 API**: Uses modern Firebase Cloud Messaging API (not deprecated)
- **Comprehensive Error Handling**: Categorizes errors as:
  - `invalid_token`: Device unregistered (non-retryable)
  - `auth_error`: Credential issues (non-retryable)
  - `network_error`: Temporary failures (retryable)
  - `unknown`: Other issues (retryable)
- **Type-Safe**: Full TypeScript with proper interfaces

**Exports:**
- `sendFCMNotification(credentials, message)` — Send notification to device
- `getAccessToken(serviceAccountJson)` — Generate OAuth token with caching
- `isValidFCMToken(token)` — Validate token format
- `parseFCMError(error)` — Parse FCM API errors

---

### ✅ 2. Production-Ready Edge Function
**File:** `supabase/functions/send-fcm-v2/index.ts`

A complete, production-grade Deno Edge Function featuring:
- **Input Validation**: Enforces required fields (userId, deviceToken, title, body)
- **Token Format Checking**: Validates device tokens are >= 100 characters
- **Structured Responses**: Returns consistent envelope format with error details
- **Async Event Logging**: Non-blocking insertion to `notification_events` table
- **Proper Error Handling**: Uses fcm-client error parsing for actionable feedback
- **Dependency Injection**: Imports and uses fcm-client for code reuse

**Request Payload:**
```json
{
  "userId": "user-uuid",
  "deviceToken": "fcm-device-token",
  "title": "Notification Title",
  "body": "Notification Body",
  "notificationId": "[optional] notification record id",
  "route": "[optional] app route to open",
  "data": "[optional] custom key-value pairs"
}
```

**Response Format:**
```json
{
  "ok": true/false,
  "messageId": "projects/...",
  "error": "[optional] error message",
  "errorDetails": {
    "type": "invalid_token|auth_error|network_error|unknown",
    "message": "Human-readable error",
    "retryable": true/false
  },
  "statusCode": 200/400/401/500
}
```

---

### ✅ 3. Token Generation Utility
**File:** `scripts/get-fcm-token.js`

A Node.js command-line utility for testing:
- Generates fresh FCM OAuth tokens from service account JSON
- Validates file existence and JSON structure
- Provides clear error messages
- Outputs token and next-step instructions
- Safe for local testing (not production)

**Usage:**
```bash
node scripts/get-fcm-token.js /path/to/service-account.json
```

---

### ✅ 4. Comprehensive Setup Guide
**File:** `FCM_SETUP_GUIDE.md`

Complete documentation covering:
1. Prerequisites and dependencies
2. Step-by-step configuration (6 steps)
3. Token generation and validation
4. Supabase secret management
5. Function deployment
6. Testing procedures with curl examples
7. Expected responses for success/error cases
8. Database event verification
9. Architecture explanation
10. Production checklist
11. Troubleshooting guide
12. Security best practices

---

### ✅ 5. Automated Testing Script
**File:** `scripts/test-fcm.sh`

Bash script for local testing:
- Loads configuration from `.env.local`
- Validates prerequisites
- Sends two test notifications (basic + with route)
- Displays responses with color-coded output
- Provides instructions for checking event logs
- User-friendly error messages

**Usage:**
```bash
./scripts/test-fcm.sh "your-device-token" "user-id"
```

---

## Next Steps (For User)

### STEP 1: Prepare FCM Credentials
From your Firebase project, you need:
1. **FCM_PROJECT_ID**: Found in service account JSON under `"project_id"`
2. **SERVICE_ACCOUNT_JSON**: The entire service account JSON file

### STEP 2: Configure Secrets
```bash
export SUPABASE_ACCESS_TOKEN="sbp_149bd66b03136fe0f21f228053ba15d73618b9e6"

npx supabase secrets set \
  FCM_PROJECT_ID="your-project-id" \
  SERVICE_ACCOUNT_JSON="$(cat /path/to/service-account.json)" \
  --project-ref wqgprkhkbqcbokxstxrq
```

### STEP 3: Deploy Function
```bash
export SUPABASE_ACCESS_TOKEN="sbp_149bd66b03136fe0f21f228053ba15d73618b9e6"

npx supabase functions deploy send-fcm-v2 \
  --project-ref wqgprkhkbqcbokxstxrq \
  --use-api
```

### STEP 4: Get Device Token from App
From your Soma app (running on device or Android emulator):
```javascript
import * as Notifications from 'expo-notifications';
const token = await Notifications.getExpoPushTokenAsync();
console.log('Device Token:', token.data);
```

### STEP 5: Run Test
```bash
./scripts/test-fcm.sh "your-device-token" "your-user-id"
```

### STEP 6: Verify in Database
```bash
npx supabase db query --linked --output json \
  "select * from notification_events where event_type='sent' order by created_at desc limit 5;"
```

---

## Optional: Integration with Scheduler

To use send-fcm-v2 in the notification scheduler, update:

**File:** `supabase/functions/process-scheduled-notifications/index.ts`

Change the send-fcm invocation to use send-fcm-v2:

```typescript
// OLD:
const sendResponse = await fetch(
  `${supabaseUrl}/functions/v1/send-fcm`,
  // ...
);

// NEW:
const sendResponse = await fetch(
  `${supabaseUrl}/functions/v1/send-fcm-v2`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey,
    },
    body: JSON.stringify({
      userId: notification.user_id,
      deviceToken: pushToken.token,
      notificationId: notification.id,
      title: message.title,
      body: message.body,
      route: message.route,
      data: message.data,
    }),
  }
);
```

Then parse the response:
```typescript
const data = await sendResponse.json();
const success = data.ok === true;
const errorType = data.errorDetails?.type;
```

---

## File Checklist

## Created Files
- [x] `supabase/functions/_shared/fcm-client.ts` (190 lines) — FCM HTTP v1 API client
- [x] `supabase/functions/send-fcm-v2/index.ts` (140 lines) — Production Edge Function
- [x] `scripts/get-fcm-token.js` (110 lines) — Token generation utility
- [x] `FCM_SETUP_GUIDE.md` — Complete setup documentation
- [x] `scripts/test-fcm.sh` — Automated test script

## Existing Infrastructure (Already Deployed)
- [x] `supabase/notifications_schema.sql` — Database schema with notification tables
- [x] `supabase/notifications_rls_patch.sql` — Row-level security policies
- [x] `supabase/functions/sync-push-token/index.ts` — Token sync endpoint (ACTIVE)
- [x] `supabase/functions/send-fcm/index.ts` — Legacy sender (ACTIVE, can coexist)
- [x] `supabase/functions/process-scheduled-notifications/index.ts` — Scheduler invoker (ACTIVE)
- [x] `supabase/schedule_notifications_cron.sql` — Cron job setup

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Soma Mobile App                        │
│  - Requests notification permissions                     │
│  - Gets FCM device token                                 │
│  - Syncs token to backend                                │
└─────────────────────────────────────────────────────────┘
                           │
                  POST /sync-push-token
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│            Supabase Edge Functions                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  sync-push-token (Sync device tokens)             │  │
│  │  ├─ Validates JWT                                 │  │
│  │  ├─ Upsert push_tokens table                      │  │
│  │  └─ Returns token_id                              │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  process-scheduled-notifications (Scheduler)      │  │
│  │  ├─ Poll due notifications every 10 min           │  │
│  │  ├─ Apply behavioral rules                        │  │
│  │  ├─ Check daily cap (default 3/day)               │  │
│  │  ├─ Retrieve device tokens                        │  │
│  │  └─ Call send-fcm-v2 for each                     │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  send-fcm-v2 (Production FCM Sender)              │  │
│  │  ├─ Validate input (POST, required fields)        │  │
│  │  ├─ Load FCM credentials from env                 │  │
│  │  ├─ Call fcm-client.sendFCMNotification()         │  │
│  │  │  ├─ Get access token (cached)                  │  │
│  │  │  ├─ Build FCM payload (v1 spec)                │  │
│  │  │  └─ POST to FCM API                            │  │
│  │  ├─ Log event to notification_events              │  │
│  │  └─ Return {ok, messageId, error?, statusCode}   │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  _shared/fcm-client.ts (Reusable FCM Logic)       │  │
│  │  ├─ sendFCMNotification()                         │  │
│  │  ├─ getAccessToken() [with caching]               │  │
│  │  ├─ isValidFCMToken()                             │  │
│  │  └─ parseFCMError()                               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                  POST to FCM API
                  (HTTP v1)
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│         Firebase Cloud Messaging (FCM)                  │
│  - Receive notification request                         │
│  - Route to target device                               │
│  - Return messageId or error                            │
└─────────────────────────────────────────────────────────┘
                           │
         Send APNs/GCM to device
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│           User's Device (iOS/Android)                   │
│  - Receive notification                                 │
│  - Display alert/badge                                  │
│  - User taps → open app with route                      │
└─────────────────────────────────────────────────────────┘

Database Tables (Supabase Postgres):
┌──────────────────────────────────────────────────────────┐
│  push_tokens (device tokens + metadata)                  │
│  notification_preferences (user settings)                │
│  scheduled_notifications (pending notifications)         │
│  notification_events (logs of all sends/failures)        │
└──────────────────────────────────────────────────────────┘
```

---

## Security Considerations

✅ **Already Implemented:**
- No static tokens hardcoded
- Service account JSON stored in Supabase secrets (encrypted)
- Dynamic token generation at runtime
- RLS policies protect notification data
- JWT authentication on all endpoints
- Error messages don't leak sensitive info

⚠️ **Recommended After Deployment:**
- Monitor FCM API usage in Google Cloud Console
- Set up alerts for failed sends (via Sentry/PostHog)
- Rotate service account credentials quarterly
- Review and audit notification logs regularly
- Implement rate limiting if expecting high volume (10K+ /day)

---

## Testing Checklist

- [ ] Prerequisites installed (node, npm, npx, google-auth-library)
- [ ] Firebase project created with service account
- [ ] FCM_PROJECT_ID and SERVICE_ACCOUNT_JSON extracted
- [ ] Supabase secrets configured
- [ ] send-fcm-v2 function deployed and ACTIVE
- [ ] Device token retrieved from test device/emulator
- [ ] `./scripts/test-fcm.sh` runs successfully
- [ ] Notification received on device
- [ ] Events logged in `notification_events` table
- [ ] Error handling tested (invalid token, network error, etc.)

---

## Deployment Commands (Quick Reference)

```bash
# 1. Set environment (one-time)
export SUPABASE_ACCESS_TOKEN="sbp_149bd66b03136fe0f21f228053ba15d73618b9e6"
export SUPABASE_PROJECT_REF="wqgprkhkbqcbokxstxrq"

# 2. Configure secrets
npx supabase secrets set \
  FCM_PROJECT_ID="your-project-id" \
  SERVICE_ACCOUNT_JSON="$(cat /path/to/service-account.json)" \
  --project-ref $SUPABASE_PROJECT_REF

# 3. Verify secrets
npx supabase secrets list --project-ref $SUPABASE_PROJECT_REF

# 4. Deploy function
npx supabase functions deploy send-fcm-v2 \
  --project-ref $SUPABASE_PROJECT_REF \
  --use-api

# 5. Verify deployment
npx supabase functions list --project-ref $SUPABASE_PROJECT_REF

# 6. Run test
./scripts/test-fcm.sh "device-token" "user-id"

# 7. Check logs
npx supabase db query --linked --output json \
  "select * from notification_events order by created_at desc limit 10;"
```

---

## Support & Troubleshooting

Common issues and solutions are documented in `FCM_SETUP_GUIDE.md` under the **Troubleshooting** section.

For additional help:
1. Check Supabase project logs: https://app.supabase.com/project/wqgprkhkbqcbokxstxrq/logs
2. Review function deployment status: `npx supabase functions list`
3. Verify secrets are set: `npx supabase secrets list`
4. Check `notification_events` table for send failures
5. Review error details in `errorDetails.message`

---

## Summary

**What's ready to deploy:**
- ✅ Production-grade FCM client (fcm-client.ts)
- ✅ Edge function with proper error handling (send-fcm-v2/index.ts)
- ✅ Token generation utility for testing
- ✅ Complete setup guide with troubleshooting
- ✅ Automated test script

**What you need to provide:**
- Firebase service account JSON
- FCM Project ID

**What happens next:**
1. Configure Supabase secrets (2 min)
2. Deploy send-fcm-v2 function (1 min)
3. Test with device token (5 min)
4. Optionally integrate with scheduler (10 min)

**Time to production:** ~20 minutes

