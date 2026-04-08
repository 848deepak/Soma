#!/usr/bin/env bash
set -euo pipefail

if [ "${1-}" = "" ]; then
  echo "Usage: bash scripts/safe-branch.sh <new-branch-name>"
  exit 1
fi

NEW_BRANCH="$1"

echo "Validating workspace before branch creation..."
bash scripts/quality-gate.sh

echo "Creating branch: $NEW_BRANCH"
git checkout -b "$NEW_BRANCH"

echo "Branch created"
