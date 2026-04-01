#!/bin/bash

##############################################################################
# test-fcm.sh
# 
# Local test script for FCM integration
# Usage: ./scripts/test-fcm.sh [device-token] [user-id]
#
# Example:
#   ./scripts/test-fcm.sh "fG0PZ..." "550e8400-e29b-41d4-a716-446655440000"
##############################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Defaults from .env.local
if [[ -f .env.local ]]; then
  export $(grep -v '^#' .env.local | xargs)
fi

SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL}"
ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY}"

DEVICE_TOKEN="${1:-}"
USER_ID="${2:-550e8400-e29b-41d4-a716-446655440000}"

if [[ -z "$DEVICE_TOKEN" ]]; then
  echo -e "${RED}❌ Usage: ./scripts/test-fcm.sh <device-token> [user-id]${NC}"
  echo ""
  echo "Get a real device token from your Expo app:"
  echo "  import * as Notifications from 'expo-notifications';"
  echo "  const token = await Notifications.getExpoPushTokenAsync();"
  echo "  console.log('Device Token:', token.data);"
  exit 1
fi

if [[ -z "$ANON_KEY" ]]; then
  echo -e "${RED}❌ Error: EXPO_PUBLIC_SUPABASE_ANON_KEY not set${NC}"
  echo "Ensure .env.local exists with EXPO_PUBLIC_SUPABASE_ANON_KEY"
  exit 1
fi

if [[ -z "$SUPABASE_URL" ]]; then
  echo -e "${RED}❌ Error: EXPO_PUBLIC_SUPABASE_URL not set${NC}"
  echo "Ensure .env.local exists with EXPO_PUBLIC_SUPABASE_URL"
  exit 1
fi

echo -e "${YELLOW}▶ Testing FCM Integration${NC}"
echo ""
echo "Configuration:"
echo "  Supabase URL:  $SUPABASE_URL"
echo "  Device Token:  ${DEVICE_TOKEN:0:20}..."
echo "  User ID:       $USER_ID"
echo ""

# Test 1: Basic notification
echo -e "${YELLOW}[Test 1] Sending basic notification...${NC}"
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/functions/v1/send-fcm-v2" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "userId": "'$USER_ID'",
    "deviceToken": "'$DEVICE_TOKEN'",
    "title": "Test from Soma",
    "body": "This is a test notification"
  }')

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

OK=$(echo "$RESPONSE" | jq -r '.ok // false' 2>/dev/null)
if [[ "$OK" == "true" ]]; then
  MESSAGE_ID=$(echo "$RESPONSE" | jq -r '.messageId' 2>/dev/null)
  echo -e "${GREEN}✅ Notification sent successfully!${NC}"
  echo "   Message ID: $MESSAGE_ID"
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"' 2>/dev/null)
  echo -e "${RED}❌ Failed to send notification${NC}"
  echo "   Error: $ERROR"
fi

echo ""

# Test 2: Notification with route
echo -e "${YELLOW}[Test 2] Sending notification with route...${NC}"
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/functions/v1/send-fcm-v2" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "userId": "'$USER_ID'",
    "deviceToken": "'$DEVICE_TOKEN'",
    "title": "Period Alert",
    "body": "Your period may start soon",
    "route": "/(tabs)/calendar",
    "data": {
      "cyclePhase": "menstrual",
      "daysUntilStart": "1"
    }
  }')

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

OK=$(echo "$RESPONSE" | jq -r '.ok // false' 2>/dev/null)
if [[ "$OK" == "true" ]]; then
  echo -e "${GREEN}✅ Notification with route sent successfully!${NC}"
else
  echo -e "${RED}❌ Failed to send notification with route${NC}"
fi

echo ""

# Test 3: Check notification events in DB
echo -e "${YELLOW}[Test 3] Checking notification_events table...${NC}"
echo "(This will be populated asynchronously)"
echo ""
echo "Run this command to check logs:"
echo ""
echo -e "${YELLOW}  npx supabase db query --linked --output json \\${NC}"
echo -e "${YELLOW}    \"select id, user_id, event_type, metadata, created_at \\${NC}"
echo -e "${YELLOW}     from public.notification_events \\${NC}"
echo -e "${YELLOW}     where user_id = '$USER_ID' \\${NC}"
echo -e "${YELLOW}     order by created_at desc limit 10;\"${NC}"
echo ""

echo -e "${GREEN}✅ FCM test complete!${NC}"
