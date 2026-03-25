#!/usr/bin/env bash

set -euo pipefail

ENVIRONMENT="${1:-development}"

required_for_all=(
  "EXPO_PUBLIC_SUPABASE_URL"
  "EXPO_PUBLIC_SUPABASE_ANON_KEY"
)

required_for_production=(
  "EXPO_PUBLIC_ENV"
)

missing=0

check_var() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "[missing] $name"
    missing=1
  fi
}

echo "Validating secrets for environment: $ENVIRONMENT"

for name in "${required_for_all[@]}"; do
  check_var "$name"
done

if [[ "$ENVIRONMENT" == "production" ]]; then
  for name in "${required_for_production[@]}"; do
    check_var "$name"
  done

  if [[ "${EXPO_PUBLIC_ENV:-}" != "production" ]]; then
    echo "[invalid] EXPO_PUBLIC_ENV must be 'production' for production builds"
    missing=1
  fi
fi

if [[ "$missing" -ne 0 ]]; then
  echo "Secret validation failed"
  exit 1
fi

echo "Secret validation passed"
