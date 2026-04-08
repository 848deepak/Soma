#!/usr/bin/env bash
set -euo pipefail

if [ "${1-}" = "" ]; then
  BRANCH="main"
else
  BRANCH="$1"
fi

echo "Validating workspace before pull..."
bash scripts/quality-gate.sh

echo "Pulling latest from origin/$BRANCH with ff-only"
git pull --ff-only origin "$BRANCH"

echo "Pull completed"
