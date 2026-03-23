# 🚀 Complete CI/CD Setup Guide for Soma App

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Part 1: EAS Setup](#part-1-eas-setup)
3. [Part 2: GitHub Secrets](#part-2-github-secrets)
4. [Part 3: First Build Test](#part-3-first-build-test)
5. [Part 4: OTA Updates](#part-4-ota-updates)
6. [Part 5: Website Integration](#part-5-website-integration)
7. [Part 6: Versioning Strategy](#part-6-versioning-strategy)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ Expo account ([create one here](https://expo.dev))
- ✅ GitHub repository with push access
- ✅ Node.js 18+ installed locally
- ✅ Expo CLI installed: `npm install -g eas-cli`

---

## Part 1: EAS Setup

### Step 1.1: Login to EAS

```bash
eas login
```

Enter your Expo credentials.

### Step 1.2: Configure EAS Project

Your project is already configured! Verify with:

```bash
eas whoami
eas project:info
```

You should see:

- Project ID: `2b688a94-93f1-4e7a-baf8-caa0a8497b01`
- Slug: `soma-health`

### Step 1.3: Configure Build Credentials

For Android (automated):

```bash
# EAS will automatically generate credentials
eas build:configure
```

For iOS (if needed later):

- You'll need an Apple Developer account ($99/year)
- Run: `eas credentials`

---

## Part 2: GitHub Secrets

### Step 2.1: Generate Expo Access Token

```bash
eas token:create --read-only=false
```

**Copy the token** - you'll only see it once!

### Step 2.2: Add GitHub Secret

1. Go to your GitHub repo: `https://github.com/YOUR_USERNAME/YOUR_REPO`
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add secret:
   - **Name**: `EXPO_TOKEN`
   - **Value**: [paste the token from Step 2.1]
5. Click **"Add secret"**

### Step 2.3: Verify Secrets

Your workflow needs only one secret:

- ✅ `EXPO_TOKEN` - for EAS authentication

`GITHUB_TOKEN` is automatically provided by GitHub Actions.

---

## Part 3: First Build Test

### Step 3.1: Manual Test Build

Before automating, test manually:

```bash
# Build preview APK
eas build --platform android --profile preview

# This will:
# 1. Upload your code to EAS
# 2. Build an APK
# 3. Provide a download link when complete (10-15 minutes)
```

### Step 3.2: Trigger Automated Build

Once manual build succeeds:

```bash
git add .
git commit -m "feat: setup CI/CD pipeline"
git push origin main
```

**What happens automatically:**

1. GitHub Actions triggers
2. Builds Android APK via EAS
3. Publishes OTA update
4. Creates `build-artifacts/latest-build.json`
5. Commits metadata back to repo

### Step 3.3: Monitor Build

Watch progress:

- **GitHub**: Go to `Actions` tab → click running workflow
- **EAS**: Visit `https://expo.dev/accounts/[your-account]/projects/soma-health/builds`

Build takes **10-20 minutes** ⏱️

---

## Part 4: OTA Updates (Over-The-Air)

### What is OTA?

OTA updates let you push JavaScript/asset updates **without rebuilding the app**. Perfect for:

- Bug fixes
- UI tweaks
- New features (that don't require native code changes)

### Step 4.1: Understanding Channels

Your app has two update channels:

```json
{
  "update": {
    "production": {
      "channel": "production" // For released apps
    },
    "preview": {
      "channel": "preview" // For testing
    }
  }
}
```

**Channel Matching:**

- Apps built with `--profile preview` receive updates from `preview` channel
- Apps built with `--profile production` receive updates from `production` channel

### Step 4.2: How It Works

**Automatic OTA (via CI/CD):**

When you push to `main`:

1. GitHub Actions publishes update to `production` channel
2. All installed apps (built with production profile) receive the update
3. Users get updates on next app launch

**Manual OTA:**

```bash
# Publish to production channel
eas update --branch production --message "Fix: Login bug"

# Publish to preview channel (for testing)
eas update --branch preview --message "Test: New feature"
```

### Step 4.3: When to Use OTA vs Full Rebuild

| Change Type                       | Method          |
| --------------------------------- | --------------- |
| JavaScript code, React components | ✅ OTA Update   |
| Styling, colors, text             | ✅ OTA Update   |
| Images, assets                    | ✅ OTA Update   |
| New native module (e.g., camera)  | ❌ Full Rebuild |
| Change to app.json permissions    | ❌ Full Rebuild |
| Expo SDK upgrade                  | ❌ Full Rebuild |

### Step 4.4: Testing OTA Updates

1. Build and install preview APK:

   ```bash
   eas build --platform android --profile preview
   # Install APK on your device
   ```

2. Make a change in your code (e.g., edit a text component)

3. Publish update:

   ```bash
   eas update --branch preview --message "Test update"
   ```

4. Close and reopen app on your device
   - App checks for updates on launch
   - Downloads update in background
   - Applies on next restart

### Step 4.5: Update Verification

Check what updates exist:

```bash
# View updates on production channel
eas update:list --branch production

# View update details
eas update:view [UPDATE_ID]
```

---

## Part 5: Website Integration

### Option A: Next.js/React Website

1. Copy `web-integration/DownloadButton.tsx` to your Next.js project
2. Update the GitHub URL:
   ```typescript
   const response = await fetch(
     "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/build-artifacts/latest-build.json",
   );
   ```
3. Use in your page:

   ```tsx
   import DownloadButton from "@/components/DownloadButton";

   export default function Home() {
     return (
       <div>
         <h1>Download Soma</h1>
         <DownloadButton />
       </div>
     );
   }
   ```

### Option B: Static HTML Website

1. Copy `web-integration/download-apk.html`
2. Update constants at the top:
   ```javascript
   const GITHUB_USERNAME = "YOUR_GITHUB_USERNAME";
   const GITHUB_REPO = "YOUR_GITHUB_REPO";
   ```
3. Host anywhere (Netlify, Vercel, GitHub Pages)

### Option C: Custom API Endpoint

Create your own API:

```javascript
// api/latest-build.js (Vercel Serverless Function)
export default async function handler(req, res) {
  const buildData = await fetch(
    "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/build-artifacts/latest-build.json",
  ).then((r) => r.json());

  res.json(buildData);
}
```

---

## Part 6: Versioning Strategy

### Auto-Increment Build Numbers

Your `eas.json` already has:

```json
{
  "build": {
    "production": {
      "autoIncrement": true // ✅ Enabled
    }
  }
}
```

This automatically increments:

- iOS: `buildNumber`
- Android: `versionCode`

### Manual Version Bumps

For major/minor versions, update `app.json`:

```json
{
  "expo": {
    "version": "1.0.0" // Change to "1.1.0" or "2.0.0"
  }
}
```

### Recommended Versioning Flow

**For new features:**

```bash
# 1. Update version in app.json
# 2. Commit with special message
git commit -m "release: v1.1.0 - Added symptom tracking"
git push

# This triggers:
# - Full build with new version
# - GitHub Release creation (automatic)
# - OTA update
```

**For bug fixes (OTA only):**

```bash
# Just commit and push - no version change needed
git commit -m "fix: resolve login issue"
git push

# This triggers:
# - OTA update only
# - No new build
```

---

## Part 7: Distribution

### Making APK Publicly Available

**Method 1: GitHub Releases** (Recommended)

Commit with `release:` prefix:

```bash
git commit -m "release: v1.0.0 - Official launch"
git push
```

This creates a GitHub Release with downloadable APK.

**Method 2: Direct EAS Link**

After each build, you get a permanent link like:

```
https://expo.dev/artifacts/eas/[long-hash].apk
```

This link never expires. Share it directly or add to your website.

**Method 3: Host APK Yourself**

Download APK and upload to:

- Firebase Hosting
- AWS S3
- Your own server

---

## Troubleshooting

### 🔴 Build Fails with "Error: Not authenticated"

**Fix:**

```bash
# Regenerate token
eas token:create

# Update GitHub secret
# Go to repo Settings → Secrets → Update EXPO_TOKEN
```

### 🔴 Build Timeout in GitHub Actions

**Cause:** EAS builds take 10-20 minutes

**Fix:** Workflow already waits 30 minutes. If still timing out:

```yaml
# In .github/workflows/build-and-deploy.yml
# Increase timeout in the polling loop:
for i in {1..60}; do # Change to {1..90} for 45 minutes
```

### 🔴 OTA Update Not Appearing

**Checklist:**

1. ✅ Built app with correct profile?
   - Preview builds get `preview` channel updates
   - Production builds get `production` channel updates

2. ✅ Published to correct branch?

   ```bash
   eas update --branch production  # Must match build profile
   ```

3. ✅ Restarted app completely?
   - Updates check on launch
   - May need to close and reopen twice

### 🔴 APK Download Link is Empty

**Cause:** Build not finished or failed

**Debug:**

```bash
# Check build status
eas build:list

# View specific build
eas build:view [BUILD_ID]
```

### 🔴 Website Shows "Unable to load latest build"

**Fixes:**

1. Check if `build-artifacts/latest-build.json` exists in your repo
2. Verify GitHub username/repo in your website code
3. Check CORS (GitHub raw content allows all origins)
4. Try accessing JSON directly in browser:
   ```
   https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/build-artifacts/latest-build.json
   ```

---

## 🎯 Quick Reference

### Common Commands

```bash
# Login
eas login

# Build APK manually
eas build --platform android --profile preview

# Publish OTA update
eas update --branch production --message "Update description"

# View builds
eas build:list

# View updates
eas update:list --branch production

# Cancel running build
eas build:cancel [BUILD_ID]
```

### Update Workflow (Day-to-Day)

**Small changes (OTA):**

```bash
git add .
git commit -m "fix: improve symptom input"
git push  # Automatic OTA update deployed
```

**Major changes (Full build):**

```bash
# Update version in app.json first
git add .
git commit -m "release: v1.2.0 - New calendar view"
git push  # Automatic build + OTA update
```

---

## 🚀 What's Automated vs Manual

### ✅ Automated (No action needed)

- Building APK when you push to `main`
- Publishing OTA updates
- Storing build metadata
- Creating GitHub releases (for `release:` commits)

### 🔧 Manual (When needed)

- Updating version numbers (for major releases)
- Building iOS (requires Apple Developer account)
- Publishing to Google Play Store (use `eas submit`)

---

## 📚 Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Expo Release Channels Guide](https://docs.expo.dev/eas-update/how-it-works/)

---

## 🎉 You're All Set!

Your pipeline is now:

1. ✅ Building automatically on every push
2. ✅ Publishing OTA updates
3. ✅ Storing build metadata for website integration
4. ✅ Creating releases for version tags

**Next Steps:**

1. Push your first commit and watch the magic happen
2. Install the APK on your device
3. Make a small change and see OTA update in action
4. Integrate download button on your website

Happy shipping! 🚀
