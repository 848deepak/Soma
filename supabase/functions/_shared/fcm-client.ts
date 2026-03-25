// @ts-nocheck
/**
 * FCM Client - Shared utility for Firebase Cloud Messaging
 * 
 * Provides:
 * - Dynamic OAuth token generation from service account
 * - FCM HTTP v1 API client
 * - Error handling and retry logic
 */

import { GoogleAuth } from 'npm:google-auth-library@9.0.0';

export interface FCMCredentials {
  projectId: string;
  serviceAccountJson: string;
}

export interface FCMMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  route?: string;
}

export interface FCMResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

let cachedAuth: GoogleAuth | null = null;
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Initialize Google Auth from service account credentials
 */
function initializeAuth(serviceAccountJson: string): GoogleAuth {
  try {
    const credentials = JSON.parse(serviceAccountJson);
    return new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
  } catch (error) {
    throw new Error(`Failed to parse service account JSON: ${error.message}`);
  }
}

/**
 * Get a fresh OAuth access token with caching
 * Tokens are typically valid for 1 hour
 */
async function getAccessToken(serviceAccountJson: string): Promise<string> {
  // Return cached token if still valid (with 5-minute buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  // Initialize auth if needed
  if (!cachedAuth) {
    cachedAuth = initializeAuth(serviceAccountJson);
  }

  try {
    const client = await cachedAuth.getClient();
    const { token, expiry_date } = await client.getAccessToken();

    if (!token) {
      throw new Error('Failed to obtain access token from Google Auth');
    }

    // Cache the token with expiry
    cachedToken = {
      token,
      expiresAt: expiry_date || Date.now() + 3600 * 1000, // Default 1 hour
    };

    return token;
  } catch (error) {
    throw new Error(`Failed to get access token: ${error.message}`);
  }
}

/**
 * Send a notification via FCM HTTP v1 API
 */
export async function sendFCMNotification(
  credentials: FCMCredentials,
  message: FCMMessage,
): Promise<FCMResponse> {
  try {
    // Validate inputs
    if (!credentials.projectId || !credentials.serviceAccountJson) {
      return {
        success: false,
        error: 'Missing FCM credentials (projectId or serviceAccountJson)',
        statusCode: 400,
      };
    }

    if (!message.token || !message.title || !message.body) {
      return {
        success: false,
        error: 'Missing required message fields (token, title, body)',
        statusCode: 400,
      };
    }

    // Get access token
    const accessToken = await getAccessToken(credentials.serviceAccountJson);

    // Build FCM message payload
    const fcmPayload = {
      message: {
        token: message.token,
        notification: {
          title: message.title,
          body: message.body,
        },
        data: {
          source: 'backend',
          route: message.route || '/(tabs)',
          ...(message.data || {}),
        },
      },
    };

    // Send to FCM API
    const url = `https://fcm.googleapis.com/v1/projects/${credentials.projectId}/messages:send`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(fcmPayload),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      // Handle specific FCM errors
      const errorMessage = responseBody.error?.message || `FCM API error: ${response.statusText}`;

      return {
        success: false,
        error: errorMessage,
        statusCode: response.status,
      };
    }

    // Success response
    return {
      success: true,
      messageId: responseBody.name,
      statusCode: 200,
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error.message}`,
      statusCode: 500,
    };
  }
}

/**
 * Validate FCM token format (basic check)
 */
export function isValidFCMToken(token: string): boolean {
  // FCM tokens are typically:
  // - iOS: 64+ hex characters
  // - Android: base64-url encoded, typically 152+ characters
  return typeof token === 'string' && token.length > 100;
}

/**
 * Parse error message into actionable feedback
 */
export function parseFCMError(error: string): {
  type: 'invalid_token' | 'auth_error' | 'network_error' | 'unknown';
  message: string;
  retryable: boolean;
} {
  if (error.includes('INVALID_ARGUMENT') || error.includes('invalid') || error.includes('not registered')) {
    return {
      type: 'invalid_token',
      message: 'Device token is invalid or unregistered.',
      retryable: false,
    };
  }

  if (error.includes('PERMISSION_DENIED') || error.includes('UNAUTHENTICATED')) {
    return {
      type: 'auth_error',
      message: 'Authentication failed. Check FCM credentials.',
      retryable: false,
    };
  }

  if (error.includes('UNAVAILABLE') || error.includes('timeout') || error.includes('DEADLINE_EXCEEDED')) {
    return {
      type: 'network_error',
      message: 'Network error. Retry later.',
      retryable: true,
    };
  }

  return {
    type: 'unknown',
    message: error,
    retryable: true,
  };
}
