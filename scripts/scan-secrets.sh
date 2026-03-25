#!/usr/bin/env bash

set -euo pipefail

# Scan tracked files for high-risk secret markers.
# This is a lightweight gate and should be complemented by platform secret scanning.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "rg not found; falling back to grep."
  SCAN_CMD="grep"
else
  SCAN_CMD="rg"
fi

# Restrict scan to tracked files to avoid node_modules/build directories.
TRACKED_FILES=$(git ls-files)

if [[ -z "$TRACKED_FILES" ]]; then
  echo "No tracked files to scan."
  exit 0
fi

FAILURES=0

scan_pattern() {
  local pattern="$1"
  local label="$2"

  if [[ "$SCAN_CMD" == "rg" ]]; then
    if echo "$TRACKED_FILES" | xargs rg -n --hidden -S --no-messages "$pattern" >/tmp/secret_scan_matches.txt; then
      echo "[FAIL] $label"
      cat /tmp/secret_scan_matches.txt
      FAILURES=1
    fi
  else
    if echo "$TRACKED_FILES" | xargs grep -nE "$pattern" >/tmp/secret_scan_matches.txt 2>/dev/null; then
      echo "[FAIL] $label"
      cat /tmp/secret_scan_matches.txt
      FAILURES=1
    fi
  fi
}

scan_pattern "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----" "Private key material"
scan_pattern "\bsbp_[A-Za-z0-9]{20,}\b" "Supabase personal access token"
scan_pattern "service_account\"[[:space:]]*:[[:space:]]*\"?\{" "Embedded service account JSON marker"
scan_pattern "AIza[0-9A-Za-z_-]{35}" "Google API key"

rm -f /tmp/secret_scan_matches.txt

if [[ "$FAILURES" -ne 0 ]]; then
  echo "Secret scan failed. Remove secrets and rotate exposed credentials."
  exit 1
fi

echo "Secret scan passed."
