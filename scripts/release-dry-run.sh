#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/6] Lint"
npm run lint

echo "[2/6] Typecheck"
npm run typecheck

echo "[3/6] Tests"
npm test -- --runInBand

echo "[4/6] Secret scan"
npm run security:scan-secrets

echo "[5/6] Production secret preflight"
npm run security:verify-secrets:production

echo "[6/6] Release config verification"
npm run release:verify-config

echo "Dry run passed."
echo "Next commands (manual trigger):"
echo "  eas build --platform android --profile production-apk --non-interactive"
echo "  eas build --platform ios --profile production-ipa --non-interactive"
