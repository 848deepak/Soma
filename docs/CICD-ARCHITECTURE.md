# 🏗️ CI/CD Pipeline Architecture

## Overview

Complete automated deployment pipeline for Soma app using GitHub Actions + Expo EAS.

## What Gets Automated

```
┌─────────────────────────────────────────────────────────────┐
│                    Push to GitHub (main)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│   Check Commit  │    │  Always: Publish │
│   Message Type  │    │    OTA Update    │
└────────┬────────┘    └──────────────────┘
         │                       │
         │                       ▼
         │             ┌──────────────────┐
         │             │ Users get update │
         │             │  on next launch  │
         │             └──────────────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌─────────┐ ┌──────────┐
│ release:│ │  Other   │
│ commit? │ │ commits  │
└────┬────┘ └────┬─────┘
     │           │
   YES          NO
     │           │
     ▼           ▼
┌──────────┐  ┌────────┐
│Full Build│  │OTA Only│
│+ Release │  │ (Fast) │
└────┬─────┘  └────────┘
     │
     ▼
┌─────────────────┐
│ Build Android   │
│ APK via EAS     │
│ (10-20 min)     │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Store Metadata  │
│ in repo as JSON │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Create GitHub   │
│    Release      │
└─────────────────┘
```

## Workflow Files

### 1. `build-and-deploy.yml` (Simple)

- **When to use:** Basic setup, always builds on push
- **Features:**
  - Builds Android APK on every push to main
  - Publishes OTA updates
  - Creates build metadata
  - Creates GitHub releases for `release:` commits
- **Duration:** ~15-25 minutes per push

### 2. `smart-build-deploy.yml` (Advanced) ⭐ Recommended

- **When to use:** Production setup, optimized workflow
- **Features:**
  - **Smart detection:** Only builds when needed
  - **Fast OTA:** Regular commits = OTA only (~2 minutes)
  - **Full builds:** Release commits or config changes
  - **Manual control:** Trigger builds via GitHub UI
  - **iOS support:** Toggle iOS builds on/off
- **Duration:**
  - OTA only: ~2-3 minutes
  - Full build: ~15-25 minutes

## Build Profiles

Configured in `eas.json`:

| Profile      | Purpose | Output    | Use Case                    |
| ------------ | ------- | --------- | --------------------------- |
| `preview`    | Testing | APK       | Internal testing, CI builds |
| `production` | Release | AAB + APK | Play Store submission       |

## OTA Update Channels

Configured in `eas.json` → `update` section:

```
production channel  ←→  production build profile
   ↓                      ↓
Apps built with        Receive updates from
production profile     production channel
```

```
preview channel     ←→  preview build profile
   ↓                      ↓
Apps built with        Receive updates from
preview profile        preview channel
```

**Important:** Channel <-> Profile must match for updates to work!

## File Outputs

### `build-artifacts/latest-build.json`

Generated after each build:

```json
{
  "version": "1.0.0",
  "buildId": "abc123...",
  "apkUrl": "https://expo.dev/artifacts/eas/xyz.apk",
  "platform": "android",
  "buildDate": "2026-03-23T10:30:00Z",
  "commitSha": "abc123",
  "commitMessage": "fix: improve symptom logging",
  "branch": "main"
}
```

**Used by:**

- Website download button
- Build API
- Version tracking

## Secrets Required

### GitHub Repository Secrets

Add these at: `Settings → Secrets and variables → Actions`

| Secret       | Description        | How to Get             |
| ------------ | ------------------ | ---------------------- |
| `EXPO_TOKEN` | EAS authentication | Run `eas token:create` |

### Automatically Provided

| Secret         | Description       | Source                          |
| -------------- | ----------------- | ------------------------------- |
| `GITHUB_TOKEN` | GitHub API access | Auto-provided by GitHub Actions |

## Distribution Methods

### Method 1: GitHub Raw (Simplest) ✅

**Pros:**

- No server needed
- Zero cost
- Works immediately

**Cons:**

- Rate limited (60 req/hr without auth)
- No analytics

**Implementation:**

```javascript
fetch(
  "https://raw.githubusercontent.com/USER/REPO/main/build-artifacts/latest-build.json",
);
```

### Method 2: GitHub Releases (Best for versioned releases) ✅

**Pros:**

- Built-in versioning
- Changelog support
- Professional appearance

**Cons:**

- Only for `release:` commits
- Manual version management

**Implementation:**
Commit with `release:` prefix:

```bash
git commit -m "release: v1.1.0 - New symptom categories"
git push
```

### Method 3: Custom API (Most flexible) ⭐

**Pros:**

- Full control
- Analytics
- Rate limiting
- Custom logic

**Cons:**

- Requires server hosting
- Additional maintenance

**Implementation:**
Deploy `build-api/` to Railway/Render/Vercel.

### Method 4: Supabase/Firebase Storage

**Pros:**

- Direct file hosting
- Built-in analytics
- Access control

**Implementation:**
Add step to workflow:

```yaml
- name: Upload to Supabase
  run: |
    curl -X POST 'https://[project].supabase.co/storage/v1/object/builds/latest.apk' \
      -H 'Authorization: Bearer ${{ secrets.SUPABASE_KEY }}' \
      --upload-file build.apk
```

## Build Duration & Costs

### Time Investment

| Task                     | First Time | Ongoing       |
| ------------------------ | ---------- | ------------- |
| Setup (following guide)  | 2-3 hours  | 0 minutes     |
| Each commit (OTA only)   | -          | 2-3 minutes   |
| Each commit (full build) | -          | 15-25 minutes |

### Costs

| Service               | Free Tier           | Cost After              |
| --------------------- | ------------------- | ----------------------- |
| Expo EAS Builds       | Limited free builds | $29/month for unlimited |
| GitHub Actions        | 2,000 minutes/month | $0.008/minute           |
| OTA Updates           | Unlimited           | Free                    |
| File hosting (GitHub) | Unlimited           | Free                    |

**Estimated cost:** $0-10/month for most projects

## Performance Optimizations

### 1. Cache Node Modules

Already implemented:

```yaml
- uses: actions/setup-node@v4
  with:
    cache: "npm" # Caches node_modules
```

### 2. Skip Builds for Docs

Add to commits that don't need builds:

```bash
git commit -m "docs: update README [skip ci]"
```

### 3. Parallel Builds

Run Android & iOS simultaneously:

```yaml
jobs:
  build-android:
    # ...
  build-ios:
    # ...
  # Both run in parallel
```

## Security Best Practices

### ✅ DO

- Store all tokens in GitHub Secrets
- Use read-only tokens when possible
- Enable branch protection on `main`
- Review workflow changes carefully
- Use `[skip ci]` for metadata commits

### ❌ DON'T

- Commit tokens to code
- Use personal tokens (use robot accounts)
- Disable code signing
- Skip credential verification

## Monitoring & Debugging

### View Build Status

**GitHub Actions:**

```
https://github.com/YOUR_USERNAME/YOUR_REPO/actions
```

**EAS Dashboard:**

```
https://expo.dev/accounts/YOUR_ACCOUNT/projects/soma-health
```

### Common Issues

**Build fails immediately:**

- Check `EXPO_TOKEN` secret is set correctly
- Verify EAS CLI version compatibility

**Build timeout:**

- EAS servers may be busy
- Retry manually: `gh workflow run build-and-deploy.yml`

**OTA not received:**

- Channel mismatch (see "OTA Update Channels" above)
- App needs restart
- Check update branch: `eas update:list --branch production`

## Scaling Considerations

### Current Capacity

- ✅ Handles 100+ commits/day
- ✅ Supports unlimited OTA updates
- ✅ Works for teams of any size

### When to Upgrade

Consider paid EAS plan when:

- Building daily/multiple times per day
- Need priority build queue
- Want dedicated support

Consider custom build server when:

- 1000+ builds/month
- Need <5 minute builds
- Custom native modules

## Architecture Decisions

### Why EAS Build?

- **Alternative:** Turtle CLI (deprecated), Fastlane
- **Chosen:** EAS is official, maintained, handles credentials
- **Trade-off:** Cloud-based (slower but zero maintenance)

### Why GitHub Actions?

- **Alternative:** GitLab CI, CircleCI, Bitrise
- **Chosen:** Native GitHub integration, generous free tier
- **Trade-off:** Limited to 6 hours per job (sufficient for mobile builds)

### Why JSON Metadata File?

- **Alternative:** Database, GitHub API, releases only
- **Chosen:** Simple, version controlled, no server needed
- **Trade-off:** Single file (not scalable to 1000s of builds)

## Future Enhancements

Possible additions:

- [ ] Automated Play Store submission (`eas submit`)
- [ ] TestFlight distribution (iOS)
- [ ] Build notifications (Slack, Discord)
- [ ] E2E tests before build
- [ ] Preview builds for PRs
- [ ] Rollback mechanism
- [ ] A/B testing with multiple update channels

---

Last updated: 2026-03-23
