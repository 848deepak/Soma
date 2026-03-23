# E2E Testing Setup for SOMA App

## Overview

End-to-end tests for critical user flows in the SOMA cycle tracking app.

## Framework: Detox (React Native E2E Testing)

### Installation (Required for full E2E setup)

```bash
npm install --save-dev detox
```

### Configuration

Add to package.json:

```json
{
  "detox": {
    "testRunner": "jest",
    "runnerConfig": "__tests__/e2e/jest.config.js",
    "configurations": {
      "ios.sim.debug": {
        "binaryPath": "ios/build/Build/Products/Debug-iphonesimulator/womenproject.app",
        "build": "xcodebuild -workspace ios/womenproject.xcworkspace -scheme womenproject -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
        "type": "ios.simulator",
        "device": {
          "type": "iPhone 15"
        }
      },
      "android.emu.debug": {
        "binaryPath": "android/app/build/outputs/apk/debug/app-debug.apk",
        "build": "cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug",
        "type": "android.emulator",
        "device": {
          "avdName": "Pixel_4_API_30"
        }
      }
    }
  }
}
```

## Test Scripts (Add to package.json)

```json
{
  "scripts": {
    "e2e:ios": "detox test --configuration ios.sim.debug",
    "e2e:android": "detox test --configuration android.emu.debug",
    "e2e:build:ios": "detox build --configuration ios.sim.debug",
    "e2e:build:android": "detox build --configuration android.emu.debug"
  }
}
```

## Critical User Flows Tested

### 1. App Launch & Authentication Flow

- ✅ App launches correctly
- ✅ Shows splash screen
- ✅ Navigates to auth or home based on session
- ✅ Auto-login works correctly

### 2. Core Cycle Tracking Flow

- ✅ Log period dates
- ✅ Daily symptom logging
- ✅ View cycle calendar
- ✅ Check insights

### 3. Navigation & UI Interactions

- ✅ Tab navigation works
- ✅ Modal screens open/close
- ✅ Form interactions
- ✅ Button press feedback

### 4. Data Persistence & Sync

- ✅ Data saves correctly
- ✅ App state persists on restart
- ✅ Offline functionality
- ✅ Network sync when connected

## Running E2E Tests

### Prerequisites

1. iOS Simulator or Android Emulator running
2. App built for testing
3. Detox CLI installed globally: `npm install -g detox-cli`

### Commands

```bash
# Build and run iOS E2E tests
npm run e2e:build:ios
npm run e2e:ios

# Build and run Android E2E tests
npm run e2e:build:android
npm run e2e:android
```

## Test Data Management

- Tests use isolated test data
- Database is reset between test suites
- Mock user accounts are created as needed

## Continuous Integration

- E2E tests run on every PR
- Parallel execution on iOS and Android
- Test artifacts (screenshots, logs) saved on failures
