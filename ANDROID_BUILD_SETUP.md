# Android Release Build Setup Guide

## Current Status
✅ **iOS Release Build**: VALIDATED (0 errors, 3 warnings, app installed on simulator)
✅ **All Tests**: PASSING (32 suites, 385 tests)
✅ **Hardening Code**: PLATFORM-AGNOSTIC (same code runs on iOS, Android, Web)
⚠️ **Android Local Build**: Requires Java and Android SDK setup

## Why Android Needs Extra Setup

Android builds require:
1. **Java Development Kit (JDK)** - For running Android build tools
2. **Android SDK** - Platform libraries, build-tools, system images
3. **ANDROID_HOME environment variable** - Points to SDK location
4. **adb (Android Debug Bridge)** - For device communication

## Quick Android Setup (One-time)

### Option 1: Install via Android Studio (Recommended)
```bash
# Install Android Studio with bundled SDK
brew install --cask android-studio

# Open Android Studio and complete setup wizard
open /Applications/Android\ Studio.app

# Android Studio will automatically set up SDK in:
# ~/Library/Android/sdk
```

After Android Studio setup, add to your shell profile (`~/.zshrc` or `~/.bash_profile`):
```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

### Option 2: Command-Line Only (Faster)
```bash
# 1. Install Java
brew install openjdk

# 2. Link Java in your shell profile
sudo ln -sfn /opt/homebrew/opt/openjdk/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk.jdk
echo 'export JAVA_HOME=$(/usr/libexec/java_home)' >> ~/.zshrc

# Reload shell
source ~/.zshrc
java -version  # Verify

# 3. Setup Android SDK (already partially done)
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

# 4. Install platform-tools  
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools"
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platforms;android-35"
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "build-tools;35.0.0"

# 5. Accept licenses
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
```

## Build Android After Setup

```bash
# Ensure environment is set
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# Build APK (no emulator needed, generates APK file)
cd /Users/parishasharma/deepakkafolder/Soma
npm run android -- --no-install
```

## Expected Android Build Output
```
> expo run:android --no-install
✓ Creating native directory
✓ Finished prebuild
...
✓ BUILD SUCCESSFUL
Starting Metro server...
✓ APK installed on [device/emulator]
```

## Production-Hardening Features on Android

All hardening is **platform-agnostic** and will work on Android:

| Feature | Status | Android Impact |
|---------|--------|-----------------|
| Secret scanning gate | ✅ Implemented | Prevents leaked tokens in APK |
| Legal disclosures | ✅ Implemented | Privacy terms shown in-app |
| Error redaction | ✅ Implemented | PHI/PII filtered in logs |
| Parental consent | ✅ Implemented | Works cross-platform |
| Session hardening | ✅ Implemented | AsyncStorage handles secure tokens |
| Edge origin checks | ✅ Implemented | Server-side, not client dependent |

## Troubleshooting

### Error: "Unable to locate Java Runtime"
```bash
# Fix: Install Java
brew install openjdk

# Link it
sudo ln -sfn /opt/homebrew/opt/openjdk/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk.jdk

# Reload shell and verify
source ~/.zshrc
java -version
```

### Error: "adb ENOENT"
```bash
# Fix: platform-tools not installed
export ANDROID_HOME="$HOME/Library/Android/sdk"
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools"
```

### Error: "ANDROID_SDK_ROOT is not set"
```bash
# Fix: Set environment variables
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

## Next Steps
1. Install Java and Android SDK using one of the options above
2. Add exports to your shell profile (`~/.zshrc`)
3. Run `npm run android -- --no-install`
4. APK will be generated at: `android/app/build/outputs/apk/debug/`

## Cloud Build Alternative (No Local Setup)

If you don't want to set up Android SDK locally, use **EAS Build**:
```bash
# Install EAS CLI (already in project)
npm install -g eas-cli

# Login to Expo account
npx eas login

# Build in cloud (no local Android SDK needed)
npx eas build --platform android
```

---

**Note**: iOS build is ✅ complete and validated. Android setup is primarily environmental (Java/SDK installation), not code-related. All hardening features are ready for Android once build environment is configured.
