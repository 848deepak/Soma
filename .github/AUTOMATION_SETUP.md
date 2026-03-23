# Automated Build & Release Setup

This document explains the automated CI/CD pipeline that builds, releases, and deploys your app.

## Overview

The GitHub Actions workflow (`.github/workflows/build-and-release.yml`) automatically:
1. ✅ Builds Android APK via EAS Build
2. ✅ Creates GitHub Release with APK
3. ✅ Updates website with latest version
4. ✅ Sends notifications on completion

## Triggers

The workflow runs automatically on:
- **Every push to `main` branch** (excluding docs changes)
- **Manual trigger** via GitHub Actions UI with custom profile selection

## Required Secrets

Configure these in GitHub repo settings → Secrets and variables → Actions:

### 1. EXPO_TOKEN (Required)
Your Expo access token for EAS builds.

**To get it:**
```bash
eas login
eas whoami
# You're logged in as: 848deepak

# Generate a token
eas build:configure
# Or create at: https://expo.dev/accounts/848deepak/settings/access-tokens
```

Then add to GitHub:
1. Go to: https://github.com/848deepak/Soma/settings/secrets/actions
2. Click "New repository secret"
3. Name: `EXPO_TOKEN`
4. Value: Your token from above

### 2. GITHUB_TOKEN (Auto-configured)
Automatically provided by GitHub Actions. No setup needed.

### 3. VERCEL_DEPLOY_HOOK (Optional)
If you want to trigger Vercel deployments automatically.

**To get it:**
1. Go to Vercel project settings → Git → Deploy Hooks
2. Create a new hook named "GitHub Actions Auto Deploy"
3. Copy the URL

Then add to GitHub repository secrets as `VERCEL_DEPLOY_HOOK`.

## How It Works

### When you push to main:

```
┌─────────────────────┐
│  Push to main       │
│  (with code changes)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  GitHub Actions     │
│  Workflow Triggers  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  EAS Build Job      │
│  • Setup Node & Expo│
│  • Install deps     │
│  • Trigger EAS build│
│  • Wait for APK     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Create Release Job │
│  • Download APK     │
│  • Generate notes   │
│  • Create release   │
│  • Upload APK       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Update Website Job │
│  • Update version   │
│  • Commit changes   │
│  • Trigger Vercel   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  ✅ Done!           │
│  APK on GitHub      │
│  Website updated    │
└─────────────────────┘
```

## Manual Triggering

To manually trigger a build:

1. Go to: https://github.com/848deepak/Soma/actions/workflows/build-and-release.yml
2. Click "Run workflow"
3. Select branch (usually `main`)
4. Choose build profile (`preview` or `production`)
5. Click "Run workflow"

## Build Profiles

### Preview (Default)
- **Type:** APK (easy install)
- **Use for:** Testing, sharing with beta testers
- **Sentry:** Disabled
- **Auto-release:** Prerelease tag

### Production
- **Type:** AAB (for Google Play Store)
- **Use for:** Official releases
- **Sentry:** Enabled
- **Auto-release:** Full release tag
- **Auto-increment:** Version code bumped automatically

## Monitoring

### GitHub Actions
- View all runs: https://github.com/848deepak/Soma/actions
- Each run shows:
  - Build logs
  - EAS build URL
  - Download link for APK
  - Release URL

### EAS Build Dashboard
- View builds: https://expo.dev/accounts/848deepak/projects/soma-health/builds
- Real-time build logs
- Build artifacts
- Build history

### GitHub Releases
- View releases: https://github.com/848deepak/Soma/releases
- Each release includes:
  - APK download
  - Version info
  - Build notes
  - Links to Expo build

## Customization

### Change when builds trigger

Edit `.github/workflows/build-and-release.yml`:

```yaml
on:
  push:
    branches: [main, develop]  # Add more branches
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

### Change version scheme

Edit version calculation in workflow or update `app.json`:

```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    }
  }
}
```

### Add notifications

Add Slack, Discord, or email notifications in the `notify` job:

```yaml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "New build v${{ needs.build-android.outputs.version }} is ready!"
      }
```

## Troubleshooting

### Build fails with "EXPO_TOKEN not set"
- Make sure you added `EXPO_TOKEN` to GitHub secrets
- Verify token at: https://expo.dev/accounts/848deepak/settings/access-tokens

### Build timeout
- Default timeout: 30 minutes
- Increase in workflow: Change `TIMEOUT=1800` to higher value

### Release creation fails
- Check GitHub Actions permissions:
  - Settings → Actions → General → Workflow permissions
  - Enable "Read and write permissions"

### Website not updating
- Verify `web/public/` directory exists
- Check Vercel deployment logs
- Ensure `VERCEL_DEPLOY_HOOK` is set (if using)

## What Happens Now

✅ **Commits pushed to GitHub**
✅ **Current build running:** https://expo.dev/accounts/848deepak/projects/soma-health/builds/ecb025b0-482c-406f-986b-003d8243128b

### Next Steps:

1. **Add EXPO_TOKEN secret:**
   - Go to https://github.com/848deepak/Soma/settings/secrets/actions
   - Add new secret: `EXPO_TOKEN`
   - Get token from: https://expo.dev/accounts/848deepak/settings/access-tokens

2. **Once you add the secret, push any change to trigger the workflow:**
   ```bash
   git commit --allow-empty -m "chore: trigger automated build"
   git push
   ```

3. **Future pushes will automatically:**
   - Build the app
   - Create GitHub releases
   - Update the website
   - No manual intervention needed!

## Benefits

✅ **No manual builds** - Push code, get APK automatically
✅ **No manual releases** - GitHub releases created with proper versioning
✅ **Website stays updated** - Version info synced automatically
✅ **Audit trail** - All builds tracked in GitHub Actions
✅ **Reproducible** - Same process every time
✅ **Fast feedback** - Know immediately if build breaks

## Cost

- **GitHub Actions:** 2,000 free minutes/month (plenty for this)
- **EAS Build (Free tier):** Queue-based builds (may wait)
- **Upgrade to EAS Production:** $29/month for priority builds

---

**Note:** Your current build (ecb025b0-482c-406f-986b-003d8243128b) was triggered manually. Once you set up the EXPO_TOKEN secret, all future builds will be fully automated!
