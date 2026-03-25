# FCM Integration Setup & Testing Guide

## Overview

This guide walks through the complete FCM (Firebase Cloud Messaging) integration for Soma, using Supabase Edge Functions with dynamic OAuth token generation.

### Key Features

✅ **Dynamic Token Generation**: Tokens expire after ~1 hour; new ones generated automatically  
✅ **No Static Secrets**: Service account JSON stored securely in Supabase  
✅ **Production-Ready**: Proper error handling, validation, and retry logic  
✅ **Scalable**: Uses HTTP v1 API (not deprecated API)  
✅ **Modular Architecture**: Shared FCM utility for reuse across functions

---

## Prerequisites

- Firebase project already created (with service account)
- Service account JSON file downloaded locally
- Supabase project linked with access token
- `node`, `npm`, and `npx` installed

---

## STEP 1: Install Dependencies

```bash
cd /Users/parishasharma/deepakkafolder/Soma

# Install google-auth-library for token generation script
npm install google-auth-library

# Supabase CLI already available via npx
```

---

## STEP 2: Generate and Validate FCM Project ID

Extract from your service account JSON:

```bash
# View your service account file
cat /path/to/service-account.json | jq '.project_id'

# Example output:
# "soma-notifications-prod"
```

**Save this value as `FCM_PROJECT_ID`** — you'll need it in Step 4.

---

## STEP 3: Generate FCM Access Token (Test Only)

This script generates a short-lived token for testing. In production, the Edge Function generates tokens dynamically.

```bash
node scripts/get-fcm-token.js /path/to/service-account.json
```

**Output:**
```
✅ FCM Access Token Generated Successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Token (valid for ~1 hour):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ya29.a0AfH6SMB...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 4: Set Supabase Secrets

Store FCM credentials securely in your Supabase project:

```bash
export SUPABASE_ACCESS_TOKEN="<your-supabase-cli-token>"

# Set FCM_PROJECT_ID
npx supabase secrets set \
  FCM_PROJECT_ID="soma-notifications-prod" \
  --project-ref wqgprkhkbqcbokxstxrq

# Set SERVICE_ACCOUNT_JSON (entire service account as JSON string)
npx supabase secrets set \
  SERVICE_ACCOUNT_JSON="$(cat /path/to/service-account.json)" \
  --project-ref wqgprkhkbqcbokxstxrq
```

**Verify secrets are set:**

```bash
npx supabase secrets list --project-ref wqgprkhkbqcbokxstxrq
```

Expected output:
```
NAME                    | DIGEST
FCM_PROJECT_ID          | a5ddc97c...
SERVICE_ACCOUNT_JSON    | 882d426...
SUPABASE_ANON_KEY       | a5ddc97c...
SUPABASE_DB_URL         | 882d426...
SUPABASE_SERVICE_ROLE_KEY | a848125...
SUPABASE_URL            | 139fd54c...
```

---

## STEP 5: Deploy New Edge Function

Deploy the production-ready `send-fcm-v2` function:

```bash
export SUPABASE_ACCESS_TOKEN="<your-supabase-cli-token>"

npx supabase functions deploy send-fcm-v2 \
  --project-ref wqgprkhkbqcbokxstxrq \
  --use-api
```

Verify deployment:

```bash
npx supabase functions list --project-ref wqgprkhkbqcbokxstxrq
```

Expected output:
```
ID                                    NAME               SLUG                  STATUS
...
abc12345-def6-7890-ghij-klmno123pqrs  send-fcm-v2        send-fcm-v2          ACTIVE
```

---

## STEP 6: Testing

### Test 1: Minimal Request (Device Token Required)

You need a real FCM device token. Get one from:
- iOS app: `APNsToken` from Expo Notifications
- Android app: FCM token from Expo Notifications

```bash
# Set your Supabase URL and anon key
SUPABASE_URL="https://wqgprkhkbqcbokxstxrq.supabase.co"
ANON_KEY="$(grep '^EXPO_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2-)"

# Replace REAL_DEVICE_TOKEN with actual token from your phone
DEVICE_TOKEN="REAL_DEVICE_TOKEN"
USER_ID="550e8400-e29b-41d4-a716-446655440000"

curl -s -X POST "$SUPABASE_URL/functions/v1/send-fcm-v2" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"deviceToken\": \"$DEVICE_TOKEN\",
    \"title\": \"Hello from Soma\",
    \"body\": \"This is a test notification\",
    \"route\": \"/(tabs)\"
  }"
```

### Test 2: With Optional Data Payload

```bash
curl -s -X POST "https://wqgprkhkbqcbokxstxrq.supabase.co/functions/v1/send-fcm-v2" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{
    \"notificationId\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"userId\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"deviceToken\": \"REAL_DEVICE_TOKEN\",
    \"title\": \"Period Alert\",
    \"body\": \"Your period may start tomorrow\",
    \"data\": {
      \"cyclePhase\": \"menstrual\",
      \"daysUntilStart\": \"1\"
    },
    \"route\": \"/(tabs)/calendar\"
  }"
```

---

## Expected Responses

### Success Response (Status 200)

Device token is valid and notification sent to FCM:

```json
{
  "ok": true,
  "messageId": "projects/soma-notifications-prod/messages/1234567890123456789",
  "statusCode": 200
}
```

### Invalid Token (Status 400)

Device token format is wrong or unregistered:

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

### Auth Error (Status 401)

FCM credentials missing or invalid:

```json
{
  "ok": false,
  "error": "PERMISSION_DENIED: Permission denied.",
  "errorDetails": {
    "type": "auth_error",
    "message": "Authentication failed. Check FCM credentials.",
    "retryable": false
  },
  "statusCode": 401
}
```

### Network/Temporary Error (Status 503)

FCM service temporarily unavailable (retry safe):

```json
{
  "ok": false,
  "error": "DEADLINE_EXCEEDED: Deadline exceeded",
  "errorDetails": {
    "type": "network_error",
    "message": "Network error. Retry later.",
    "retryable": true
  },
  "statusCode": 503
}
```

---

## Verify Notification Events Logged

Check your Supabase database to confirm notifications were logged:

```bash
export SUPABASE_ACCESS_TOKEN="<your-supabase-cli-token>"

npx supabase db query --linked --output json \
  "select id, notification_id, user_id, event_type, metadata, created_at 
   from public.notification_events 
   where event_type in ('sent','failed')
   order by created_at desc 
   limit 10;"
```

Example output:
```json
[
  {
    "id": "d1234567-e29b-41d4-a716-446655440000",
    "notification_id": null,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "event_type": "sent",
    "metadata": {
      "device_token_length": 152,
      "fcm_message_id": "projects/soma-notifications-prod/messages/1234567890123456789",
      "error": null,
      "error_type": null
    },
    "created_at": "2026-03-25T15:30:45.123Z"
  }
]
```

---

## Architecture

### Files Created

```
scripts/
  └── get-fcm-token.js                    # Token generation utility
  
supabase/functions/
  ├── _shared/
  │   └── fcm-client.ts                   # Reusable FCM logic
  └── send-fcm-v2/
      └── index.ts                        # Production-ready FCM sender
```

### Data Flow

```
Request → send-fcm-v2 (Edge Function)
  ├── Validate input (token, title, body)
  ├── Load FCM credentials from env
  ├── Call fcm-client.ts:sendFCMNotification()
  │   ├── Get access token (cached for ~1 hour)
  │   ├── Build FCM payload
  │   └── Send to FCM HTTP v1 API
  ├── Log event to notification_events table
  └── Return structured response
```

### Token Lifecycle

- **Generated**: On first use in send-fcm-v2
- **Cached**: For 1 hour with 5-minute safety buffer
- **Refreshed**: Automatically when expired
- **No Storage**: Never persisted to database or secrets

---

## Production Checklist

- [x] Dynamic token generation (no static tokens stored)
- [x] Service account stored securely (Supabase secrets)
- [x] Error handling for invalid tokens, network issues, auth failures
- [x] Structured response format for easy parsing
- [x] Event logging to `notification_events` table
- [x] HTTP v1 API (not deprecated)
- [x] Modular architecture (fcm-client for reuse)
- [x] Proper input validation
- [ ] Rate limiting per user (add if high volume)
- [ ] Token rotation on secret rotation (add if needed)
- [ ] Monitoring + alerting on failed sends (add to observability stack)

---

## Troubleshooting

### Issue: "Missing FCM_PROJECT_ID or SERVICE_ACCOUNT_JSON"

**Solution:**
```bash
npx supabase secrets list --project-ref wqgprkhkbqcbokxstxrq
```
Ensure both secrets are present. If missing, re-run Step 4.

### Issue: "Invalid device token format"

**Solution:**
Verify the token from your app is >= 100 characters. If using simulator:
- iOS Simulator does not support FCM
- Use a real iOS device or Android emulator

### Issue: "Authentication failed"

**Solution:**
```bash
# Verify service account JSON is valid
cat /path/to/service-account.json | jq '.'

# Re-set the secret
npx supabase secrets set \
  SERVICE_ACCOUNT_JSON="$(cat /path/to/service-account.json)" \
  --project-ref wqgprkhkbqcbokxstxrq
```

### Issue: Token generation script fails with "MODULE_NOT_FOUND"

**Solution:**
```bash
npm install google-auth-library
```

---

## Security Notes

1. **Never commit service-account.json** to git
2. **Rotate service accounts regularly** (best practice: quarterly)
3. **Use fine-grained IAM roles** (not Editor/Viewer)
4. **Monitor FCM API usage** in Google Cloud Console
5. **Keep Supabase secrets rotated** when team changes

---

## Next Steps

1. **Integrate into process-scheduled-notifications** to send notifications from DB queue
2. **Add rate limiting** if expecting high volume
3. **Set up monitoring** with Sentry/PostHog for failed sends
4. **Load test** with 10K+ devices before production launch

