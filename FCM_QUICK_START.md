# FCM Quick Start (5-Minute Overview)

## What Was Built

A complete, production-ready Firebase Cloud Messaging integration for Soma with:
- ✅ Dynamic OAuth token generation (no static tokens)
- ✅ Secure credential handling (Supabase secrets)
- ✅ Comprehensive error handling
- ✅ Event logging to database
- ✅ Full documentation + test utilities

---

## Files Created

```
✅ supabase/functions/_shared/fcm-client.ts         (FCM HTTP v1 client)
✅ supabase/functions/send-fcm-v2/index.ts          (Production edge function)
✅ scripts/get-fcm-token.js                         (Token generation utility)
✅ scripts/test-fcm.sh                              (Automated test script)
✅ FCM_SETUP_GUIDE.md                               (Complete setup walkthrough)
✅ FCM_INTEGRATION_SUMMARY.md                       (Architecture + next steps)
✅ FCM_IMPLEMENTATION_MANIFEST.md                   (Full manifest)
```

---

## Your Next Steps (In Order)

### Step 1: Gather Firebase Credentials
From your Firebase project, get:
1. **FCM_PROJECT_ID** — from service account JSON: `"project_id": "soma-proj-123"`
2. **SERVICE_ACCOUNT_JSON** — the entire service account JSON file

### Step 2: Configure Supabase Secrets (2 min)
```bash
export SUPABASE_ACCESS_TOKEN="<your-supabase-cli-token>"

npx supabase secrets set \
  FCM_PROJECT_ID="your-project-id" \
  SERVICE_ACCOUNT_JSON="$(cat /path/to/service-account.json)" \
  --project-ref wqgprkhkbqcbokxstxrq
```

Verify:
```bash
npx supabase secrets list --project-ref wqgprkhkbqcbokxstxrq
```

### Step 3: Deploy Function (1 min)
```bash
export SUPABASE_ACCESS_TOKEN="<your-supabase-cli-token>"

npx supabase functions deploy send-fcm-v2 \
  --project-ref wqgprkhkbqcbokxstxrq \
  --use-api
```

Verify:
```bash
npx supabase functions list --project-ref wqgprkhkbqcbokxstxrq
# Should show: send-fcm-v2 | ACTIVE
```

### Step 4: Get Device Token from App (5 min)
Run your Soma app on a real device or Android emulator.

In your app code, log the device token:
```javascript
import * as Notifications from 'expo-notifications';

const token = await Notifications.getExpoPushTokenAsync();
console.log('Device Token:', token.data);
```

Copy this token from the console.

### Step 5: Test with curl
```bash
# Load your env
export $(grep -v '^#' .env.local | xargs)
ANON_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"
SUPABASE_URL="$EXPO_PUBLIC_SUPABASE_URL"

# Send test notification
curl -X POST "$SUPABASE_URL/functions/v1/send-fcm-v2" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "userId": "your-user-id-here",
    "deviceToken": "your-device-token-here",
    "title": "Hello Soma",
    "body": "Test notification works!"
  }'
```

Expected response:
```json
{
  "ok": true,
  "messageId": "projects/.../messages/...",
  "statusCode": 200
}
```

### Step 6: Verify in Database
Check that the notification was logged:
```bash
npx supabase db query --linked --output json \
  "select * from notification_events where event_type='sent' order by created_at desc limit 5;"
```

You should see a row with your event.

### Step 7: Check Your Device
You should receive a notification on your device with the title "Hello Soma" and body "Test notification works!"

---

## Or Use the Test Script (Simpler)

Once you have a device token:
```bash
./scripts/test-fcm.sh "your-device-token" "your-user-id"
```

This runs the same curl requests for you with color-coded output.

---

## Expected Responses

### ✅ Success (Status 200)
```json
{
  "ok": true,
  "messageId": "projects/soma-proj/messages/1234567890123456789",
  "statusCode": 200
}
```

### ❌ Invalid Token (Status 400)
```json
{
  "ok": false,
  "error": "INVALID_ARGUMENT: Invalid value at 'message.token'",
  "errorDetails": {
    "type": "invalid_token",
    "message": "Device token is invalid or unregistered.",
    "retryable": false
  },
  "statusCode": 400
}
```

### ❌ Missing Credentials (Status 401)
```json
{
  "ok": false,
  "error": "PERMISSION_DENIED",
  "errorDetails": {
    "type": "auth_error",
    "message": "Authentication failed. Check FCM credentials.",
    "retryable": false
  },
  "statusCode": 401
}
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Missing FCM_PROJECT_ID" | Run Step 2 again: `npx supabase secrets set ...` |
| Device token too short | token must be ≥100 chars; verify you're copying the full token |
| Function returns 404 | Run Step 3 again: `npx supabase functions deploy send-fcm-v2` |
| "No notifications received" | Check Supabase logs: https://app.supabase.com/project/wqgprkhkbqcbokxstxrq/logs |
| Device is simulator | iOS simulator doesn't support FCM; use real device or Android emulator |

### Full Troubleshooting
See [FCM_SETUP_GUIDE.md → Troubleshooting](FCM_SETUP_GUIDE.md)

---

## Architecture

```
Mobile App
    ↓ (device token)
Sync Function (sync-push-token)
    ↓ (store token)
push_tokens table
    ↓
Scheduler (every 10 min)
    ↓ (retrieve due notifications)
send-fcm-v2 Function
    ↓ (dynamic token generation)
fcm-client.ts
    ↓ (HTTP v1 API)
Firebase Cloud Messaging
    ↓
User's Device (APNs/GCM)
    ↓
Notification Delivered ✅
```

---

## Documentation Guide

- **Getting Started** → Read this file (you are here)
- **Full Setup** → [FCM_SETUP_GUIDE.md](FCM_SETUP_GUIDE.md) (6 steps with details)
- **Architecture** → [FCM_INTEGRATION_SUMMARY.md](FCM_INTEGRATION_SUMMARY.md) (complete overview)
- **Implementation** → [FCM_IMPLEMENTATION_MANIFEST.md](FCM_IMPLEMENTATION_MANIFEST.md) (technical manifest)

---

## Total Time to Production

| Step | Time | Notes |
|------|------|-------|
| 1. Gather credentials | 2 min | Copy from Firebase console |
| 2. Set secrets | 2 min | Supabase CLI command |
| 3. Deploy function | 1 min | Single CLI command |
| 4. Get device token | 5 min | Run app on device |
| 5. Test | 2 min | curl or test script |
| 6. Verify | 1 min | Database query |
| **Total** | **~15 min** | **Production ready** |

---

## That's It!

Once you set the secrets and deploy the function, FCM integration is complete and ready to use.

Next optional steps:
- Update the scheduler to use send-fcm-v2 (10 min)
- Set up monitoring/alerts (optional)
- Load test with many devices (optional)

→ **Questions?** See [FCM_SETUP_GUIDE.md](FCM_SETUP_GUIDE.md) or review the code comments in `supabase/functions/_shared/fcm-client.ts`

