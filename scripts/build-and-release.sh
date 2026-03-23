#!/bin/bash
#
# Manual Build & Release Script
# Use this if you want to build and release without GitHub Actions
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Soma Health - Build & Release Tool   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Configuration
PROFILE="${1:-preview}"
PROJECT_NAME="soma-health"

echo -e "${YELLOW}Build Profile:${NC} $PROFILE"
echo ""

# 1. Check prerequisites
echo -e "${YELLOW}[1/7]${NC} Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

if ! command -v eas &> /dev/null; then
    echo -e "${YELLOW}Installing EAS CLI...${NC}"
    npm install -g eas-cli
fi

if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI not found. Release creation will be skipped.${NC}"
    GH_AVAILABLE=false
else
    GH_AVAILABLE=true
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# 2. Get version info
echo -e "${YELLOW}[2/7]${NC} Getting version info..."
VERSION=$(node -p "require('./app.json').expo.version")
BUILD_NUMBER=$(node -p "require('./app.json').expo.android?.versionCode || '1'")
echo -e "Version: ${GREEN}$VERSION${NC}"
echo -e "Build Number: ${GREEN}$BUILD_NUMBER${NC}"
echo ""

# 3. Trigger EAS Build
echo -e "${YELLOW}[3/7]${NC} Triggering EAS build..."
eas build --platform android --profile $PROFILE --non-interactive --no-wait --json > build-output.json

BUILD_ID=$(cat build-output.json | jq -r '.[0].id')
echo -e "Build ID: ${GREEN}$BUILD_ID${NC}"
echo -e "Build URL: ${GREEN}https://expo.dev/accounts/848deepak/projects/$PROJECT_NAME/builds/$BUILD_ID${NC}"
rm build-output.json
echo ""

# 4. Wait for build
echo -e "${YELLOW}[4/7]${NC} Waiting for build to complete..."
echo -e "${YELLOW}This may take 10-30 minutes depending on the queue...${NC}"
echo ""

TIMEOUT=1800  # 30 minutes
ELAPSED=0
INTERVAL=30

while [ $ELAPSED -lt $TIMEOUT ]; do
    # Get build status
    BUILD_STATUS=$(eas build:view $BUILD_ID --json 2>/dev/null | jq -r '.status' || echo "UNKNOWN")

    # Calculate time remaining
    TIME_MINS=$((ELAPSED / 60))
    TIME_SECS=$((ELAPSED % 60))

    case $BUILD_STATUS in
        "IN_QUEUE")
            echo -e "⏳ [${TIME_MINS}m ${TIME_SECS}s] Waiting in queue..."
            ;;
        "IN_PROGRESS")
            echo -e "🔨 [${TIME_MINS}m ${TIME_SECS}s] Building..."
            ;;
        "FINISHED")
            echo -e "${GREEN}✓ Build completed successfully!${NC}"
            echo ""
            break
            ;;
        "ERRORED"|"CANCELED")
            echo -e "${RED}❌ Build failed with status: $BUILD_STATUS${NC}"
            echo -e "Check logs: https://expo.dev/accounts/848deepak/projects/$PROJECT_NAME/builds/$BUILD_ID"
            exit 1
            ;;
        *)
            echo -e "❓ [${TIME_MINS}m ${TIME_SECS}s] Status: $BUILD_STATUS"
            ;;
    esac

    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${RED}❌ Build timed out after $((TIMEOUT / 60)) minutes${NC}"
    exit 1
fi

# 5. Download APK
echo -e "${YELLOW}[5/7]${NC} Downloading APK..."
DOWNLOAD_URL=$(eas build:view $BUILD_ID --json | jq -r '.artifacts.buildUrl')

if [ -z "$DOWNLOAD_URL" ] || [ "$DOWNLOAD_URL" = "null" ]; then
    echo -e "${RED}❌ Failed to get download URL${NC}"
    exit 1
fi

APK_FILE="$PROJECT_NAME-v$VERSION-build$BUILD_NUMBER.apk"
curl -L -o "$APK_FILE" "$DOWNLOAD_URL"

if [ -f "$APK_FILE" ]; then
    FILE_SIZE=$(ls -lh "$APK_FILE" | awk '{print $5}')
    echo -e "${GREEN}✓ Downloaded: $APK_FILE ($FILE_SIZE)${NC}"
else
    echo -e "${RED}❌ Download failed${NC}"
    exit 1
fi
echo ""

# 6. Create GitHub Release
if [ "$GH_AVAILABLE" = true ]; then
    echo -e "${YELLOW}[6/7]${NC} Creating GitHub release..."

    TAG_NAME="v$VERSION-build.$BUILD_NUMBER"
    RELEASE_TITLE="Soma Health v$VERSION (Build $BUILD_NUMBER)"

    # Create release notes
    cat > release-notes.md <<EOF
## What's New in v$VERSION

🎉 Latest build of Soma Health - Period & Wellness Companion

### Installation
- Download the APK below
- Enable "Install from Unknown Sources" on your Android device
- Install the app

### Features
- Period tracking with calendar view
- Health insights and analytics
- Secure data sync with Supabase
- Privacy-focused design

### Build Info
- Version: $VERSION
- Build Number: $BUILD_NUMBER
- Build ID: [$BUILD_ID](https://expo.dev/accounts/848deepak/projects/$PROJECT_NAME/builds/$BUILD_ID)
- Platform: Android
- Profile: $PROFILE

### Links
- [GitHub Repository](https://github.com/848deepak/Soma)
- [Website](https://soma-health.vercel.app)
EOF

    # Check if release exists
    if gh release view "$TAG_NAME" &>/dev/null; then
        echo -e "${YELLOW}Release $TAG_NAME already exists, deleting...${NC}"
        gh release delete "$TAG_NAME" --yes
    fi

    # Create new release
    if [ "$PROFILE" = "production" ]; then
        gh release create "$TAG_NAME" \
            --title "$RELEASE_TITLE" \
            --notes-file release-notes.md \
            "$APK_FILE"
    else
        gh release create "$TAG_NAME" \
            --title "$RELEASE_TITLE" \
            --notes-file release-notes.md \
            --prerelease \
            "$APK_FILE"
    fi

    rm release-notes.md

    echo -e "${GREEN}✓ GitHub release created${NC}"
    echo -e "Release URL: ${GREEN}https://github.com/848deepak/Soma/releases/tag/$TAG_NAME${NC}"
else
    echo -e "${YELLOW}[6/7]${NC} Skipping GitHub release (gh CLI not available)"
fi
echo ""

# 7. Update website
echo -e "${YELLOW}[7/7]${NC} Updating website version info..."

if [ -d "web/public" ]; then
    cat > web/public/version.json <<EOF
{
  "version": "$VERSION",
  "buildNumber": "$BUILD_NUMBER",
  "buildId": "$BUILD_ID",
  "downloadUrl": "https://github.com/848deepak/Soma/releases/download/$TAG_NAME/$APK_FILE",
  "releaseUrl": "https://github.com/848deepak/Soma/releases/tag/$TAG_NAME",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    echo -e "${GREEN}✓ Website version updated${NC}"
    echo ""

    # Commit the change
    if git diff --quiet web/public/version.json 2>/dev/null; then
        echo -e "${YELLOW}No changes to commit${NC}"
    else
        echo -e "${YELLOW}Committing version update...${NC}"
        git add web/public/version.json
        git commit -m "chore: update app version to $VERSION (build $BUILD_NUMBER)"
        echo -e "${GREEN}✓ Committed${NC}"

        read -p "Push to GitHub? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git push
            echo -e "${GREEN}✓ Pushed to GitHub${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  web/public directory not found, skipping website update${NC}"
fi
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Build Complete! 🎉             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Version: ${GREEN}$VERSION${NC}"
echo -e "Build: ${GREEN}$BUILD_NUMBER${NC}"
echo -e "APK File: ${GREEN}$APK_FILE${NC}"
echo ""
echo -e "Build Details:"
echo -e "https://expo.dev/accounts/848deepak/projects/$PROJECT_NAME/builds/$BUILD_ID"
echo ""

if [ "$GH_AVAILABLE" = true ]; then
    echo -e "GitHub Release:"
    echo -e "https://github.com/848deepak/Soma/releases/tag/$TAG_NAME"
    echo ""
fi

echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Test the APK on your device"
echo -e "2. Share the download link with users"
echo -e "3. Monitor for issues"
echo ""
