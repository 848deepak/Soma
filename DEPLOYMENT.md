# 🚀 SOMA - Production Build & Deployment Guide

## 📋 Pre-Build Checklist

### Environment Setup
- [ ] Expo CLI installed (`npm install -g @expo/cli`)
- [ ] EAS CLI installed (`npm install -g @expo/eas-cli`)
- [ ] Expo account configured (`eas login`)
- [ ] Project registered with EAS (`eas build:configure`)

### Production Environment Variables
Create `.env.production` file:
```bash
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_SUPABASE_URL=your_production_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn
EXPO_PUBLIC_POSTHOG_API_KEY=your_posthog_api_key
```

### Code Quality Verification
```bash
# Run type checking
npm run typecheck

# Run tests
npm run test

# Run test coverage
npm run test:coverage

# Build for web (smoke test)
npx expo export --platform web
```

## 🔧 Build Configuration

### Android Production Build

1. **Generate Production AAB**
```bash
eas build --platform android --profile production
```

2. **Generate APK for Testing**
```bash
eas build --platform android --profile preview
```

### iOS Production Build

1. **Generate App Store Build**
```bash
eas build --platform ios --profile production
```

2. **Generate TestFlight Build**
```bash
eas build --platform ios --profile preview
```

### Universal Build
```bash
eas build --platform all --profile production
```

## 📱 Android Store Preparation

### 1. App Signing
- EAS handles app signing automatically
- Production builds use upload keys managed by Google Play
- No manual keystore management required

### 2. Google Play Console Setup
1. Create app in Google Play Console
2. Upload AAB file from EAS build
3. Configure store listing:
   - Title: "SOMA - Cycle Companion"
   - Short description: "Personal cycle tracking with intelligent insights"
   - Full description: (see marketing copy below)
   - Screenshots: Use `/assets/screenshots/` folder
   - Privacy policy: Required (create one)

### 3. Required Store Assets
- App icon: 512x512 PNG
- Feature graphic: 1024x500 PNG
- Screenshots: Multiple device sizes
- Privacy policy URL

### 4. Release Process
```bash
# 1. Build AAB
eas build --platform android --profile production

# 2. Download AAB from EAS dashboard
# 3. Upload to Google Play Console
# 4. Submit for review

# Alternative: Auto-submit (requires setup)
eas submit --platform android --latest
```

## 🍎 iOS Store Preparation

### 1. App Store Connect Setup
1. Create app in App Store Connect
2. Configure app information
3. Set pricing and availability
4. Add app description and keywords

### 2. TestFlight Beta Testing
```bash
# Build and submit to TestFlight
eas build --platform ios --profile preview
eas submit --platform ios --latest
```

### 3. Production Release
```bash
# Build for App Store
eas build --platform ios --profile production
eas submit --platform ios --latest
```

## 🔍 Quality Assurance

### Pre-Release Testing Checklist
- [ ] App launches successfully
- [ ] Authentication flow works
- [ ] Data persists after app restart
- [ ] Push notifications work
- [ ] Offline functionality works
- [ ] All navigation flows function
- [ ] No memory leaks or crashes
- [ ] Performance is acceptable
- [ ] Works on different screen sizes
- [ ] Dark mode functions correctly

### Device Testing Matrix
**Android:**
- Samsung Galaxy S21+ (Android 14)
- Google Pixel 6 (Android 13)
- OnePlus 9 (Android 12)

**iOS:**
- iPhone 14 Pro (iOS 17)
- iPhone 12 (iOS 16)
- iPhone SE (iOS 15)

## 📊 Performance Monitoring

### Set Up Monitoring (Post-Release)
1. **Sentry Error Tracking**
   - Monitor crash reports
   - Track performance issues
   - Set up alerts for error thresholds

2. **PostHog Analytics**
   - Track user engagement
   - Monitor feature adoption
   - A/B test new features

3. **EAS Insights**
   - Build performance metrics
   - Crash analytics
   - Update adoption rates

## 🚢 Deployment Pipeline

### Automated CI/CD (Optional)
```yaml
# .github/workflows/deploy.yml
name: EAS Build and Deploy
on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - run: npm ci
      - run: npm run test
      - run: npm run typecheck

      - name: Setup Expo
        uses: expo/expo-github-action@v7
        with:
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build for Android
        run: eas build --platform android --profile production --non-interactive
```

## 🔐 Security Checklist

### Pre-Release Security Review
- [ ] No sensitive data in logs
- [ ] API keys in environment variables only
- [ ] SQL injection protection enabled
- [ ] HTTPS everywhere
- [ ] User data encrypted at rest
- [ ] Proper session management
- [ ] Input validation on all forms
- [ ] Rate limiting on API endpoints

## 📈 Release Strategy

### Version Numbering
- Use semantic versioning (1.0.0)
- Increment patch for bug fixes (1.0.1)
- Increment minor for features (1.1.0)
- Increment major for breaking changes (2.0.0)

### Gradual Rollout
1. **Internal Testing** - Team members (1-2 days)
2. **Beta Testing** - Close users (1 week)
3. **Staged Rollout** - 10% → 50% → 100% (1 week each)

### Rollback Plan
- Keep previous version APK/IPA available
- Monitor crash rates after release
- Be prepared to halt rollout if issues arise
- Have hotfix process defined

## 📞 Support & Maintenance

### Post-Launch Monitoring
- Monitor store reviews daily
- Track key performance indicators
- Set up alerts for critical issues
- Plan regular updates (monthly)

### Update Schedule
- **Critical fixes**: Within 24 hours
- **Security patches**: Within 1 week
- **Feature updates**: Monthly
- **Major releases**: Quarterly

---

## 🎯 Build Commands Quick Reference

```bash
# Development builds
eas build --platform android --profile development
eas build --platform ios --profile development

# Preview builds (internal testing)
eas build --platform android --profile preview
eas build --platform ios --profile preview

# Production builds
eas build --platform android --profile production
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android --latest
eas submit --platform ios --latest

# Check build status
eas build:list

# Download builds
eas build:download [BUILD_ID]
```

---

## ✅ Release Readiness Checklist

**Technical:**
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Build succeeds on EAS
- [ ] Store assets prepared

**Business:**
- [ ] App store listings complete
- [ ] Privacy policy published
- [ ] Terms of service ready
- [ ] Marketing materials prepared
- [ ] Support documentation ready

**Operations:**
- [ ] Monitoring configured
- [ ] Error tracking active
- [ ] Analytics implemented
- [ ] Backup procedures tested
- [ ] Team trained on deployment process

🎉 **Ready for Production Release!**