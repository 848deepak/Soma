#!/usr/bin/env bash
set -euo pipefail

chmod +x .githooks/pre-push

git config core.hooksPath .githooks

echo "Configured git hooks path to .githooks"
