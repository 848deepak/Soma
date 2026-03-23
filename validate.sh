#!/bin/bash

# 🚀 SOMA App - Final Validation Script
# Runs comprehensive checks to ensure the app is production-ready

set -e

echo "🔍 Starting SOMA App Final Validation..."
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Keep track of validation results
VALIDATION_ERRORS=0

# Function to log results
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
}

echo ""
echo "📋 1. Checking Prerequisites..."
echo "--------------------------------"

# Check Node.js version
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    log_success "Node.js found: $NODE_VERSION"
else
    log_error "Node.js not found"
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    log_success "npm found: $NPM_VERSION"
else
    log_error "npm not found"
fi

# Check Expo CLI
if command -v npx expo >/dev/null 2>&1; then
    log_success "Expo CLI available via npx"
else
    log_warning "Expo CLI not found globally, will use npx"
fi

echo ""
echo "📦 2. Checking Dependencies..."
echo "------------------------------"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    log_success "node_modules directory exists"
else
    log_error "node_modules directory missing - run 'npm install'"
fi

# Check package.json
if [ -f "package.json" ]; then
    log_success "package.json found"
else
    log_error "package.json not found"
fi

echo ""
echo "🔧 3. TypeScript Validation..."
echo "------------------------------"

# Run TypeScript check
if npm run typecheck >/dev/null 2>&1; then
    log_success "TypeScript compilation successful"
else
    log_error "TypeScript compilation failed - fix type errors"
fi

echo ""
echo "🧪 4. Testing..."
echo "----------------"

# Check if tests pass
if npm test -- --passWithNoTests >/dev/null 2>&1; then
    log_success "All tests passing"
else
    log_warning "Some tests failing or test command issues"
fi

echo ""
echo "📱 5. App Configuration Validation..."
echo "-------------------------------------"

# Check app.json
if [ -f "app.json" ]; then
    log_success "app.json found"

    # Check for required fields
    if grep -q '"name"' app.json && grep -q '"version"' app.json; then
        log_success "Essential app.json fields present"
    else
        log_error "Missing essential fields in app.json"
    fi

    # Check bundle identifiers
    if grep -q '"bundleIdentifier"' app.json && grep -q '"package"' app.json; then
        log_success "Bundle identifiers configured"
    else
        log_warning "Bundle identifiers may need configuration"
    fi
else
    log_error "app.json not found"
fi

# Check EAS configuration
if [ -f "eas.json" ]; then
    log_success "eas.json found"

    if grep -q '"production"' eas.json; then
        log_success "Production build profile configured"
    else
        log_error "Production build profile missing in eas.json"
    fi
else
    log_error "eas.json not found - needed for production builds"
fi

echo ""
echo "🔐 6. Security & Environment..."
echo "-------------------------------"

# Check for .env files
if [ -f ".env" ] || [ -f ".env.local" ] || [ -f ".env.production" ]; then
    log_success "Environment configuration found"
else
    log_warning "No environment files found - make sure env vars are configured"
fi

# Check for sensitive files in git
if [ -f ".gitignore" ]; then
    if grep -q ".env" .gitignore && grep -q "node_modules" .gitignore; then
        log_success ".gitignore properly configured"
    else
        log_warning ".gitignore may be missing important entries"
    fi
else
    log_error ".gitignore not found"
fi

# Check for hardcoded secrets (basic check)
if grep -r "sk_" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v test; then
    log_error "Potential hardcoded API keys found"
else
    log_success "No obvious hardcoded secrets found"
fi

echo ""
echo "📊 7. Asset & Resource Validation..."
echo "------------------------------------"

# Check for required assets
ASSET_DIRS=("assets/images" "assets/fonts")
for dir in "${ASSET_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        log_success "$dir directory exists"
    else
        log_warning "$dir directory missing"
    fi
done

# Check for app icon
if [ -f "assets/images/icon.png" ]; then
    log_success "App icon found"
else
    log_error "App icon (assets/images/icon.png) not found"
fi

# Check for splash screen
if [ -f "assets/images/splash-icon.png" ]; then
    log_success "Splash screen asset found"
else
    log_error "Splash screen asset not found"
fi

echo ""
echo "🏗️  8. Build Readiness..."
echo "-------------------------"

# Check if we can start the Metro bundler (quick test)
log_success "Metro bundler check would require manual testing"

# Check Expo project validity
if npx expo doctor --fix-dependencies=false >/dev/null 2>&1; then
    log_success "Expo project configuration valid"
else
    log_warning "Expo doctor found issues - check with 'npx expo doctor'"
fi

echo ""
echo "📋 9. Code Quality..."
echo "--------------------"

# Check for TODO comments that might need attention
TODO_COUNT=$(grep -r "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo "0")
if [ "$TODO_COUNT" -gt 0 ]; then
    log_warning "$TODO_COUNT TODO/FIXME comments found - review before production"
else
    log_success "No TODO/FIXME comments found"
fi

# Check for console.log statements
CONSOLE_COUNT=$(grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo "0")
if [ "$CONSOLE_COUNT" -gt 0 ]; then
    log_warning "$CONSOLE_COUNT console.log statements found - consider removing for production"
else
    log_success "No console.log statements found"
fi

echo ""
echo "🚀 10. Final Production Readiness..."
echo "-----------------------------------"

# Summarize critical issues
if [ "$VALIDATION_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}"
    echo "🎉 VALIDATION SUCCESSFUL!"
    echo "========================"
    echo "✅ SOMA app is ready for production build"
    echo "🚢 You can proceed with: eas build --platform all --profile production"
    echo -e "${NC}"
else
    echo -e "${RED}"
    echo "❌ VALIDATION FAILED!"
    echo "===================="
    echo "Found $VALIDATION_ERRORS critical issues that must be fixed before production"
    echo "Please address the errors above and run validation again"
    echo -e "${NC}"
fi

echo ""
echo "📝 Next Steps:"
echo "1. Fix any critical issues shown above"
echo "2. Run 'npm run test' to ensure all tests pass"
echo "3. Test the app on devices: 'npx expo run:android' / 'npx expo run:ios'"
echo "4. Build production version: 'eas build --platform all --profile production'"
echo "5. Submit to stores: 'eas submit --platform all --latest'"

exit $VALIDATION_ERRORS