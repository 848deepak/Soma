# Error Boundary Integration Guide

This guide explains how to integrate the newly wrapped screen components with error boundaries into your routing.

## Quick Start

All key screens now have exported wrapper functions with `ScreenErrorBoundary`:

```typescript
// Before (old)
export function HomeScreen() { ... }

// After (new)
export function HomeScreen() { ... }
export function HomeScreenWithErrorBoundary() {
  return (
    <ScreenErrorBoundary screenName="HomeScreen">
      <HomeScreen />
    </ScreenErrorBoundary>
  );
}
```

## Updated Screens

| Screen | Core Component | Wrapped Export |
|--------|---|---|
| Home | `HomeScreen` | `HomeScreenWithErrorBoundary` |
| Daily Log | `DailyLogScreen` | `DailyLogScreenWithErrorBoundary` |
| Smart Calendar | `SmartCalendarScreen` | `SmartCalendarScreenWithErrorBoundary` |
| Settings | `SettingsScreen` | `SettingsScreenWithErrorBoundary` |

## How to Use in Routing

### Option 1: Update in app/(tabs)/_layout.tsx & app/_layout.tsx

If you route to these screens via Expo Router:

```typescript
// Before
import { HomeScreen } from '@/src/screens/HomeScreen';

// After
import { HomeScreenWithErrorBoundary } from '@/src/screens/HomeScreen';

// In your <Stack.Screen /> or <Tabs.Screen />:
<Stack.Screen
  name="home"
  component={HomeScreenWithErrorBoundary}
/>
```

### Option 2: Keep Using Direct Imports (Recommended for Expo Router)

If using Expo Router's file-based routing (recommended approach):

```
app/
  (tabs)/
    index.tsx  → imports HomeScreenWithErrorBoundary
    calendar.tsx → imports SmartCalendarScreenWithErrorBoundary
    settings.tsx → imports SettingsScreenWithErrorBoundary
```

In each file:

```typescript
import { HomeScreenWithErrorBoundary } from '@/src/screens/HomeScreen';

export default HomeScreenWithErrorBoundary;
```

## Verification

After integrating, test each screen:

1. **Open screen** → should load normally
2. **Simulate error** (dev mode):
   - Add `throw new Error('Test');` in component
   - Screen should show error fallback (not crash whole app)
   - "Try Again" button should work
   - "Go Back" button should navigate away

## Expected Behavior

### Normal Operation
- User uses screen normally
- No errors → no error boundary shown

### Error Occurs
- React error thrown in screen
- Error boundary catches it
- Shows friendly error UI (no stack trace)
- Logs to Sentry with screen name
- User can retry (up to 2 times by default) or go back

### Multiple Errors
- After max retries (default: 2), user sees message
- Can still go back
- Button text changes from "Try again" to "Go back"

## Configuration

### Max Retries

Default is 2 retries. To customize:

```typescript
<ScreenErrorBoundary screenName="HomeScreen" maxRetries={1}>
  <HomeScreen />
</ScreenErrorBoundary>
```

### Custom Error Handler

To notify parent component of errors:

```typescript
<ScreenErrorBoundary
  screenName="HomeScreen"
  onError={(error, info) => {
    console.log('Error in HomeScreen:', error);
    // Or send to analytics
    analytics.trackScreenError({
      screen: 'HomeScreen',
      error: error.message,
    });
  }}
>
  <HomeScreen />
</ScreenErrorBoundary>
```

## Remaining Screens (Optional)

These screens can also be wrapped (lower priority):

- `DailyLogScreen` ✅ Done
- `SmartCalendarScreen` ✅ Done
- `LoginScreen` (auth screen, usually has top-level error handling)
- `SignupScreen` (auth screen)
- `InsightsScreen`
- `CareCircleScreen`
- `PartnerSyncScreen`
- `QuickCheckinScreen`
- `EditProfileScreen`
- `EditPreferenceScreen`
- `WelcomeScreen` (first-time UX)
- `SetupScreen` (onboarding)

To wrap a screen:

```typescript
// At the end of the screen file, add:
export function ScreenNameWithErrorBoundary() {
  return (
    <ScreenErrorBoundary screenName="ScreenName">
      <ScreenName />
    </ScreenErrorBoundary>
  );
}
```

## Debugging

### Error Not Caught?

If a screen error isn't caught by `ScreenErrorBoundary`, it might be:

1. **Async error** (not during render)
   - Error boundaries only catch render errors
   - For async errors, catch in the function or use `.catch()` in promises

2. **Error in event handler**
   - Wrap handlers with try-catch manually
   - Or use the error boundary + manual error state

3. **Context Provider error**
   - Wrap parent `<Provider>` with `AppErrorBoundary` (app-level)

### Solution: Manual Error Boundary for Async

```typescript
function MyScreen() {
  const handleSave = async () => {
    try {
      await saveData();
    } catch (error) {
      setError(error); // Show error UI manually
    }
  };

  if (error) {
    return <ErrorFallback error={error} onRetry={() => setError(null)} />;
  }

  return <Content />;
}
```

## Monitoring

### Sentry Integration

Errors logged to Sentry with:
- `screen` tag: `screen_error:HomeScreen`
- `errorBoundary` tag: `screen_level`
- `componentStack`: React component trace
- `retryCount`: How many times user retried

View in Sentry dashboard:
```
Issues → Filter by tag:screen_error:HomeScreen
```

### Analytics

Consider tracking:
- How many times error boundary hit per screen (should be rare)
- Which errors most common
- Do users click "Try Again" or "Go Back"?

## Questions?

- **Error boundary not showing?** Check that screen is wrapped with `ScreenErrorBoundary`
- **Error is blank/generic?** That's intentional (security: no error messages to users)
- **Want to add more details?** Use `errorKey` to map to i18n messages
- **Need custom error UI?** Duplicate `ScreenErrorFallback` component and customize

---

**Status**: All 4 core screens wrapped ✅
**Next**: Wrap remaining screens (optional) or monitor in production
