#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROFILE="${1:-production-apk}"
OUT_DIR="${2:-dist/releases}"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required"
  exit 1
fi

mkdir -p "$OUT_DIR"

wait_for_eas_build() {
  local platform="$1"
  local build_id="$2"
  local timeout="$3"
  local elapsed=0
  local interval=30

  while [ "$elapsed" -lt "$timeout" ]; do
    status=$(npx eas build:view "$build_id" --json | jq -r '.status')
    echo "[$platform] status: $status (${elapsed}s elapsed)"

    if [ "$status" = "FINISHED" ]; then
      npx eas build:view "$build_id" --json | jq -r '.artifacts.buildUrl'
      return 0
    fi

    if [ "$status" = "ERRORED" ] || [ "$status" = "CANCELED" ]; then
      echo "[$platform] build failed: $status"
      return 1
    fi

    sleep "$interval"
    elapsed=$((elapsed + interval))
  done

  echo "[$platform] build timed out"
  return 1
}

echo "Starting Android build with profile: $PROFILE"
npx eas build --platform android --profile "$PROFILE" --non-interactive --no-wait --json > /tmp/soma-android-build.json
ANDROID_BUILD_ID=$(jq -r '.[0].id' /tmp/soma-android-build.json)
ANDROID_URL=$(wait_for_eas_build "android" "$ANDROID_BUILD_ID" 1800)

echo "Starting iOS build with profile: production-ipa"
npx eas build --platform ios --profile production-ipa --non-interactive --no-wait --json > /tmp/soma-ios-build.json
IOS_BUILD_ID=$(jq -r '.[0].id' /tmp/soma-ios-build.json)
IOS_URL=$(wait_for_eas_build "ios" "$IOS_BUILD_ID" 2400)

APK_PATH="$OUT_DIR/soma-health.apk"
IPA_PATH="$OUT_DIR/soma-health.ipa"

curl -L "$ANDROID_URL" -o "$APK_PATH"
curl -L "$IOS_URL" -o "$IPA_PATH"

echo "Artifacts ready:"
ls -lh "$APK_PATH" "$IPA_PATH"
