# Build Scripts

Automation scripts for building and releasing Soma Health.

## Available Scripts

### `build-and-release.sh`

Complete build and release automation script. Builds the app, creates GitHub release, and updates the website.

**Usage:**

```bash
# Build with preview profile (default)
./scripts/build-and-release.sh

# Build with production profile
./scripts/build-and-release.sh production
```

**What it does:**
1. ✅ Checks prerequisites (Node.js, EAS CLI, GitHub CLI)
2. ✅ Triggers EAS build
3. ✅ Waits for build to complete
4. ✅ Downloads APK
5. ✅ Creates GitHub release
6. ✅ Updates website version info
7. ✅ Commits and optionally pushes changes

**Prerequisites:**
- Node.js installed
- EAS CLI (`npm install -g eas-cli`)
- GitHub CLI (`brew install gh`) - optional, for releases
- Logged in to EAS (`eas login`)
- Logged in to GitHub (`gh auth login`) - if using releases

**Example output:**

```
╔════════════════════════════════════════╗
║  Soma Health - Build & Release Tool   ║
╚════════════════════════════════════════╝

Build Profile: preview

[1/7] Checking prerequisites...
✓ Prerequisites OK

[2/7] Getting version info...
Version: 1.0.0
Build Number: 1

[3/7] Triggering EAS build...
Build ID: abc123-build-id
Build URL: https://expo.dev/accounts/848deepak/projects/soma-health/builds/abc123

[4/7] Waiting for build to complete...
⏳ [0m 30s] Waiting in queue...
🔨 [5m 0s] Building...
✓ Build completed successfully!

[5/7] Downloading APK...
✓ Downloaded: soma-health-v1.0.0-build1.apk (45M)

[6/7] Creating GitHub release...
✓ GitHub release created
Release URL: https://github.com/848deepak/Soma/releases/tag/v1.0.0-build.1

[7/7] Updating website version info...
✓ Website version updated
✓ Committed
✓ Pushed to GitHub

╔════════════════════════════════════════╗
║         Build Complete! 🎉             ║
╚════════════════════════════════════════╝
```

## Automated Builds (GitHub Actions)

For fully automated builds, see `.github/AUTOMATION_SETUP.md`.

The GitHub Actions workflow does everything automatically on every push to `main`:
- No manual script execution needed
- Runs in the cloud
- Results posted to GitHub releases
- Website updated automatically

## When to Use Which

### Use GitHub Actions (Recommended)
- ✅ For regular development workflow
- ✅ Automatic on every push
- ✅ No local setup needed
- ✅ Runs in cloud (free 2000 mins/month)
- ✅ Creates releases automatically

### Use Manual Script
- 🔧 For testing builds locally
- 🔧 When GitHub Actions is down
- 🔧 For custom build configurations
- 🔧 When you want immediate feedback

## Troubleshooting

### "eas: command not found"
```bash
npm install -g eas-cli
```

### "Not logged in to Expo"
```bash
eas login
```

### "gh: command not found"
```bash
# macOS
brew install gh

# Or skip GitHub releases (script will still work)
```

### Build fails or times out
- Check EAS build dashboard: https://expo.dev/accounts/848deepak/projects/soma-health/builds
- View build logs for detailed error messages
- Ensure you're on a stable internet connection

### APK download fails
- Build may not have completed successfully
- Check build URL for artifact availability
- Try viewing the build: `eas build:view <BUILD_ID>`

## Tips

- **Faster builds:** Upgrade to EAS Production plan ($29/month) for priority queue
- **Parallel work:** Start build in background, continue coding
- **Testing:** Use preview profile for APK builds, production for AAB/Store builds
- **Version management:** Update `app.json` version before building

## See Also

- Main documentation: `README.md`
- Automation setup: `.github/AUTOMATION_SETUP.md`
- Deployment guide: `DEPLOYMENT.md`
