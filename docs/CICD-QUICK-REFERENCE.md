# 📝 CI/CD Quick Reference

## 🚀 Common Commands

### EAS Build Commands

```bash
# Build preview APK (for testing)
eas build --platform android --profile preview

# Build production AAB (for Play Store)
eas build --platform android --profile production

# Build iOS simulator
eas build --platform ios --profile development

# View all builds
eas build:list

# View specific build
eas build:view [BUILD_ID]

# Cancel build
eas build:cancel [BUILD_ID]

# Check credentials
eas credentials
```

### EAS Update Commands (OTA)

```bash
# Publish update to production
eas update --branch production --message "Bug fixes"

# Publish update to preview
eas update --branch preview --message "Testing new feature"

# View all updates
eas update:list --branch production

# View specific update
eas update:view [UPDATE_ID]

# Rollback to previous update
eas update:republish --group [UPDATE_GROUP_ID]

# Delete update
eas update:delete [UPDATE_ID]
```

### Git Workflow

```bash
# Regular commit (OTA only - fast)
git add .
git commit -m "fix: resolve symptom input bug"
git push

# Release commit (Full build + OTA - slow)
git add .
git commit -m "release: v1.2.0 - Add cycle prediction"
git push

# Skip CI entirely
git commit -m "docs: update README [skip ci]"
git push
```

### GitHub CLI Commands

```bash
# View workflow runs
gh run list

# Watch running workflow
gh run watch

# Rerun failed workflow
gh run rerun [RUN_ID]

# Manually trigger workflow
gh workflow run smart-build-deploy.yml

# View releases
gh release list

# View specific release
gh release view v1.0.0
```

---

## 🔄 Workflows

### Workflow 1: Simple (always builds)

**File:** `.github/workflows/build-and-deploy.yml`

**When it runs:**

- Every push to `main`

**What it does:**

1. ✅ Builds Android APK
2. ✅ Publishes OTA update
3. ✅ Commits build metadata
4. ✅ Creates release (for `release:` commits only)

**Use when:**

- Setting up for the first time
- You want every commit to trigger a build

### Workflow 2: Smart (recommended) ⭐

**File:** `.github/workflows/smart-build-deploy.yml`

**When it runs:**

- Every push to `main`
- Manual trigger via GitHub UI

**Decision logic:**

```
IF commit message starts with "release:"
  → Full build + OTA + GitHub Release

ELSE IF app.json/eas.json/package.json changed
  → Full build + OTA

ELSE
  → OTA update only (no build - super fast!)
```

**Use when:**

- In production
- Frequent commits/pushes
- Want to optimize build time and costs

---

## 🎯 Common Workflows

### Scenario 1: Bug Fix (Fast - 2 minutes)

```bash
# Fix bug in code
vim app/screens/HomeScreen.tsx

# Commit and push
git add .
git commit -m "fix: resolve crash on symptom save"
git push

# Result:
# ✅ OTA update published (2-3 minutes)
# ✅ Users get update on next app launch
# ❌ No new build (existing APK still works)
```

### Scenario 2: New Feature Release (Slow - 20 minutes)

```bash
# Build new feature
vim app/screens/AnalyticsScreen.tsx

# Update version
vim app.json  # Change "version": "1.1.0"

# Commit with release prefix
git add .
git commit -m "release: v1.1.0 - Analytics dashboard"
git push

# Result:
# ✅ Full Android build (15-25 minutes)
# ✅ OTA update published
# ✅ Build metadata committed
# ✅ GitHub Release v1.1.0 created
# ✅ Users can download new APK
```

### Scenario 3: Hotfix Production (Immediate)

```bash
# Fix critical bug
vim app/utils/encryption.ts

# Publish OTA immediately (skip CI)
eas update --branch production --message "Hotfix: Fix data encryption"

# Users get update within minutes
```

### Scenario 4: Test Build Locally

```bash
# Option A: Full build
eas build --platform android --profile preview --local

# Option B: Development build for testing
eas build --platform android --profile development --local

# Option C: Just run locally
npm start
```

---

## 📊 Build Profiles Comparison

| Profile       | Distribution   | Output | Signing | Use Case                      |
| ------------- | -------------- | ------ | ------- | ----------------------------- |
| `development` | Internal       | APK    | Debug   | Local development, debugging  |
| `preview`     | Internal       | APK    | Release | Beta testing, CI builds       |
| `production`  | Store/External | AAB    | Release | Play Store, official releases |

---

## 🌐 Website Integration Options

### Option 1: Fetch from GitHub (No server)

```html
<script>
  const REPO = "username/repo";
  const url = `https://raw.githubusercontent.com/${REPO}/main/build-artifacts/latest-build.json`;

  fetch(url)
    .then((r) => r.json())
    .then((data) => {
      document.getElementById("download-link").href = data.apkUrl;
    });
</script>
```

### Option 2: Netlify Redirect (Cleanest URLs)

In `netlify.toml`:

```toml
[[redirects]]
  from = "/download"
  to = "https://raw.githubusercontent.com/USER/REPO/main/build-artifacts/latest-build.json"
  status = 200
  force = true

[[redirects]]
  from = "/download/apk"
  to = "/.netlify/functions/get-apk-url"
  status = 302
```

### Option 3: Serverless Function (Vercel/Netlify)

```javascript
// api/download.js
export default async function handler(req, res) {
  const response = await fetch(
    "https://raw.githubusercontent.com/USER/REPO/main/build-artifacts/latest-build.json",
  );
  const data = await response.json();
  res.redirect(302, data.apkUrl);
}
```

---

## 🔐 Security Checklist

- [ ] `EXPO_TOKEN` is stored in GitHub Secrets (not in code)
- [ ] Branch protection enabled on `main`
- [ ] Workflow requires approval for first-time contributors
- [ ] Build artifacts use HTTPS URLs only
- [ ] Credentials managed by EAS (not committed)
- [ ] `[skip ci]` used for metadata commits (prevents infinite loop)

---

## 📈 Analytics & Monitoring

### Track Downloads

Add to your website:

```javascript
// Track when users click download
function trackDownload(apkUrl) {
  // Google Analytics
  gtag("event", "download", {
    event_category: "engagement",
    event_label: "apk_download",
    value: 1,
  });

  // Or PostHog, Mixpanel, etc.
  window.location.href = apkUrl;
}
```

### Monitor Build Success Rate

```bash
# Get last 10 builds
eas build:list --limit 10 --json > builds.json

# Count successes
cat builds.json | jq '[.[] | select(.status == "finished")] | length'
```

### Monitor OTA Update Adoption

Check Expo dashboard:

```
https://expo.dev/accounts/YOUR_ACCOUNT/projects/soma-health/updates
```

Shows:

- How many users received update
- Update download success rate
- Runtime errors after update

---

## 🎓 Learning Resources

### Video Tutorials

- [Expo EAS Build Guide](https://www.youtube.com/watch?v=Nxm787H_Sbo)
- [GitHub Actions Basics](https://www.youtube.com/watch?v=R8_veQiYBjI)

### Documentation

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Update Docs](https://docs.expo.dev/eas-update/introduction/)
- [GitHub Actions for Expo](https://docs.expo.dev/build/building-on-ci/)

### Community

- [Expo Discord](https://chat.expo.dev/)
- [Expo Forums](https://forums.expo.dev/)

---

## 💡 Pro Tips

1. **Use smart workflow** - Save time and money with `smart-build-deploy.yml`
2. **Test OTA first** - Always test updates on preview channel before production
3. **Semantic commits** - Use conventional commits (`feat:`, `fix:`, `release:`)
4. **Monitor builds** - Set up Slack/Discord notifications for build failures
5. **Version properly** - Use semver (1.0.0 → 1.1.0 → 2.0.0)
6. **Preview deployments** - Create preview APKs for each PR (advanced)
7. **Rollback quickly** - Keep previous APK links for emergency rollback

---

## 🆘 Emergency Procedures

### Rollback OTA Update

```bash
# 1. Find previous good update
eas update:list --branch production

# 2. Republish previous update
eas update:republish --group [PREVIOUS_UPDATE_GROUP_ID]

# Users will receive rollback on next launch
```

### Rollback Full Release

```bash
# Option 1: Revert commit
git revert HEAD
git push

# Option 2: Share previous APK link
# Get from previous GitHub Release or EAS dashboard
```

### Build Emergency APK Locally

```bash
# If CI is down, build locally
eas build --platform android --profile preview --local

# Upload to Dropbox/Drive and share link
```

---

**Last Updated:** March 23, 2026
**Pipeline Version:** 1.0
**Status:** Production Ready ✅
