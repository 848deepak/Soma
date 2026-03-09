import { Redirect } from 'expo-router';

/**
 * Root route intentionally forwards to login.
 * AuthBootstrap in app/_layout.tsx then controls final destination
 * based on session + onboarding state.
 */
export default function Index() {
  return <Redirect href="/auth/login" />;
}
