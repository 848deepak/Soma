#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/security-check-secrets.sh
#
# CI/Pre-commit security check to prevent accidental exposure of sensitive keys.
#
# Usage:
#   ./scripts/security-check-secrets.sh              # Run all scans
#   ./scripts/security-check-secrets.sh --app-only    # Scan only app bundle
#   ./scripts/security-check-secrets.sh --env-file    # Scan env files
#
# Exit codes:
#   0 = All checks passed
#   1 = Critical secret found in source
#   2 = Warning (e.g., suspicious env file committed)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

APP_DIR="src"
DANGER_PATTERNS=(
  # Service role keys (should NEVER be in app)
  "service_role"
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.*service"  # JWT with 'service' claim

  # Firebase service accounts
  "private_key.*-----BEGIN PRIVATE KEY"
  "SERVICE_ACCOUNT_JSON.*private_key"

  # API keys that shouldn't be hardcoded
  "RESEND_API_KEY\s*=\s*re_"
  "SUPABASE_SERVICE_ROLE_KEY"

  # Database connection strings
  "postgresql:/.*:.*@"
  "postgres:/.*:.*@"

  # OAuth secrets
  "client_secret"
  "authorization.*bearer.*[A-Za-z0-9_-]{40,}"
)

# Environment files that should NOT be committed
ENV_FILES=(
  ".env.local"
  ".env.production.local"
  ".env*.local"
)

FOUND_ISSUES=0
FOUND_CRITICAL=0

# ─────────────────────────────────────────────────────────────────────────────

print_header() {
  echo -e "\n${GREEN}═══════════════════════════════════════════════${NC}"
  echo -e "${GREEN}$1${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════${NC}\n"
}

print_error() {
  echo -e "${RED}❌ CRITICAL: $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# ─────────────────────────────────────────────────────────────────────────────
# Check 1: Service role keys in app bundle
# ─────────────────────────────────────────────────────────────────────────────

check_service_role_in_app() {
  print_header "Check 1: Looking for SERVICE_ROLE keys in app bundle..."

  if grep -r "service_role" "$APP_DIR" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"; then
    print_error "SERVICE_ROLE key found in app source!"
    print_error "Service role keys must ONLY exist in edge function environments, never in mobile app bundle."
    FOUND_CRITICAL=$((FOUND_CRITICAL + 1))
  else
    print_success "No service_role keys in app bundle"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check 2: Private keys in source
# ─────────────────────────────────────────────────────────────────────────────

check_private_keys() {
  print_header "Check 2: Scanning for private keys and certificates..."

  local patterns=(
    "-----BEGIN PRIVATE KEY-----"
    "-----BEGIN RSA PRIVATE KEY-----"
    "-----BEGIN OPENSSH PRIVATE KEY-----"
    "-----BEGIN PGP PRIVATE KEY-----"
  )

  local found=0
  for pattern in "${patterns[@]}"; do
    if grep -r "$pattern" . \
      --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
      --exclude-dir=node_modules --exclude-dir=build --exclude-dir=dist \
      --exclude-dir=.next 2>/dev/null; then
      found=$((found + 1))
      FOUND_CRITICAL=$((FOUND_CRITICAL + 1))
    fi
  done

  if [ $found -eq 0 ]; then
    print_success "No private keys detected"
  else
    print_error "$found private key(s) detected in source code!"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check 3: Suspicious patterns
# ─────────────────────────────────────────────────────────────────────────────

check_suspicious_patterns() {
  print_header "Check 3: Scanning for suspicious key patterns..."

  local found=0
  for pattern in "${DANGER_PATTERNS[@]}"; do
    if grep -rE "$pattern" "$APP_DIR" \
      --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
      2>/dev/null | grep -v "test" | grep -v ".test."; then
      print_warning "Pattern '$pattern' found in app bundle"
      found=$((found + 1))
      FOUND_ISSUES=$((FOUND_ISSUES + 1))
    fi
  done

  if [ $found -eq 0 ]; then
    print_success "No suspicious patterns detected"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check 4: Environment files committed
# ─────────────────────────────────────────────────────────────────────────────

check_env_files() {
  print_header "Check 4: Checking for committed environment files..."

  # Check if files are tracked in git
  local found=0
  for pattern in "${ENV_FILES[@]}"; do
    if git ls-files | grep -E "^\\.env" >/dev/null 2>&1; then
      print_warning ".env file appears to be git-tracked: $pattern"
      print_warning "This exposes real credentials on public repositories!"
      found=$((found + 1))
      FOUND_ISSUES=$((FOUND_ISSUES + 1))
    fi
  done

  if [ $found -eq 0 ]; then
    print_success ".env files not tracked in git"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check 5: AWS/GCP credentials in build artifacts
# ─────────────────────────────────────────────────────────────────────────────

check_build_artifacts() {
  print_header "Check 5: Scanning build artifacts for embedded credentials..."

  local found=0

  # Check generated bundle for credential patterns
  if [ -d "dist" ] || [ -d "build" ] || [ -d ".expo" ]; then
    for dir in dist build .expo; do
      if [ -d "$dir" ]; then
        if grep -r "AKIA[0-9A-Z]\{16\}" "$dir" 2>/dev/null; then
          print_error "AWS access key found in build artifact: $dir"
          found=$((found + 1))
          FOUND_CRITICAL=$((FOUND_CRITICAL + 1))
        fi

        if grep -r "AIza[0-9A-Za-z_-]\{35\}" "$dir" 2>/dev/null; then
          print_error "GCP API key found in build artifact: $dir"
          found=$((found + 1))
          FOUND_CRITICAL=$((FOUND_CRITICAL + 1))
        fi
      fi
    done
  fi

  if [ $found -eq 0 ]; then
    print_success "No AWS/GCP credentials in build artifacts"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check 6: git history for secrets (sample recent commits)
# ─────────────────────────────────────────────────────────────────────────────

check_git_history() {
  print_header "Check 6: Sampling recent git commits for secrets..."

  # Check last 20 commits for suspicious patterns
  local found=0

  if ! git diff-tree -r -S "service_role" HEAD~20..HEAD 2>/dev/null | grep -q ""; then
    print_success "No service_role patterns in recent git history"
  else
    print_warning "service_role found in recent git history"
    found=$((found + 1))
    FOUND_ISSUES=$((FOUND_ISSUES + 1))
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check 7: Package.json scripts for credential leaks
# ─────────────────────────────────────────────────────────────────────────────

check_scripts() {
  print_header "Check 7: Checking package.json scripts for hardcoded keys..."

  if grep -E "SUPABASE.*service_role|SERVICE_ROLE" package.json 2>/dev/null; then
    print_warning "Possible service_role in package.json scripts"
    FOUND_ISSUES=$((FOUND_ISSUES + 1))
  else
    print_success "No hardcoded keys in package.json scripts"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Summary and exit
# ─────────────────────────────────────────────────────────────────────────────

main() {
  echo ""
  print_header "🔒 Security Check: Secrets & Credentials Scan"

  # Determine which checks to run
  if [ "${1:-}" = "--app-only" ]; then
    check_service_role_in_app
    check_suspicious_patterns
  elif [ "${1:-}" = "--env-file" ]; then
    check_env_files
  else
    # Run all checks
    check_service_role_in_app
    check_private_keys
    check_suspicious_patterns
    check_env_files
    check_build_artifacts
    check_git_history
    check_scripts
  fi

  # Summary
  echo ""
  print_header "📋 Scan Summary"

  if [ $FOUND_CRITICAL -gt 0 ]; then
    print_error "CRITICAL ISSUES FOUND: $FOUND_CRITICAL"
    echo ""
    echo "Next steps:"
    echo "  1. Remove any exposed credentials immediately"
    echo "  2. Rotate credentials if this was production code"
    echo "  3. Review deployment history for unauthorized access"
    echo "  4. Commit a fix and re-run this scan"
    echo ""
    exit 1
  fi

  if [ $FOUND_ISSUES -gt 0 ]; then
    print_warning "Warnings found: $FOUND_ISSUES"
    echo ""
    echo "Next steps:"
    echo "  1. Review warnings above"
    echo "  2. Fix any issues before committing"
    echo "  3. Ensure .env files are in .gitignore"
    echo ""
    exit 0  # Warnings don't fail CI, but critical issues do
  fi

  print_success "All checks passed! 🎉"
  echo ""
  exit 0
}

# ─────────────────────────────────────────────────────────────────────────────

main "$@"
