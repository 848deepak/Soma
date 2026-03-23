import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { SomaLoadingSplash } from '@/src/components/ui/SomaLoadingSplash';

/**
 * Root route defaults to home tabs.
 * AuthBootstrap in app/_layout.tsx performs auth/onboarding gating
 * and redirects to auth or welcome when needed.
 *
 * This component shows a brief loading splash to prevent flash of unstyled content.
 */
export default function Index() {
  const [showRedirect, setShowRedirect] = useState(false);

  useEffect(() => {
    // Brief delay to allow app initialization
    const timer = setTimeout(() => {
      setShowRedirect(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!showRedirect) {
    return (
      <SomaLoadingSplash
        timeout={2000}
        onTimeout={() => setShowRedirect(true)}
        subtitle="Starting SOMA..."
      />
    );
  }

  return <Redirect href="/(tabs)" />;
}
