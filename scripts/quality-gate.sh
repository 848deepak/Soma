#!/usr/bin/env bash
set -euo pipefail

echo "Running quality gate: lint, typecheck, tests"

npm run lint
npm run typecheck
npm test -- --runInBand

echo "Quality gate passed"
