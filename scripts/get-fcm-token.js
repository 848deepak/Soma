#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * FCM Token Generator
 * 
 * Generates a short-lived OAuth2 access token for Firebase Cloud Messaging.
 * Used for testing and one-time setup validation.
 * 
 * Usage:
 *   node scripts/get-fcm-token.js /path/to/service-account.json
 * 
 * The service account JSON should have structure:
 * {
 *   "type": "service_account",
 *   "project_id": "...",
 *   "private_key_id": "...",
 *   "private_key": "...",
 *   "client_email": "...",
 *   "client_id": "...",
 *   ...
 * }
 */

const fs = require('fs');
const path = require('path');

async function getFCMToken() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('❌ Error: No service account file provided.');
    console.error('Usage: node scripts/get-fcm-token.js /path/to/service-account.json');
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }

  try {
    // Dynamically import google-auth-library
    const { GoogleAuth } = await import('google-auth-library');

    console.log('🔐 Initializing Google Auth...');

    const auth = new GoogleAuth({
      keyFile: resolvedPath,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();

    const token = tokenResponse.token || tokenResponse;

    if (!token) {
      console.error('❌ Error: Failed to generate token. Response:', tokenResponse);
      process.exit(1);
    }

    console.log('\n✅ FCM Access Token Generated Successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Token (valid for ~1 hour):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(token);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 Next Steps:');
    console.log('');
    console.log('1. Extract the "project_id" from your service account JSON:');
    console.log(`   cat ${resolvedPath} | grep "project_id"`);
    console.log('');
    console.log('2. Set Supabase secrets:');
    console.log('   export SUPABASE_ACCESS_TOKEN="your_token"');
    console.log('   npx supabase secrets set \\');
    console.log('     FCM_PROJECT_ID="your_project_id" \\');
    console.log('     SERVICE_ACCOUNT_JSON="$(cat /path/to/service-account.json)" \\');
    console.log('     --project-ref wqgprkhkbqcbokxstxrq');
    console.log('');
    console.log('3. Test the send-fcm function (see TESTING section in README).');
    console.log('');
  } catch (error) {
    console.error('❌ Error generating token:');
    console.error(error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('\n💡 Hint: Install google-auth-library first:');
      console.error('   npm install google-auth-library');
    }
    process.exit(1);
  }
}

getFCMToken();
