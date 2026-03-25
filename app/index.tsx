import { Redirect } from 'expo-router';

/**
 * Root route defaults to home tabs.
 * AuthBootstrap in app/_layout.tsx performs auth/onboarding gating
 * and redirects to auth or welcome when needed.
 */
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
