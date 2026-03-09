# Women Health App - Phase 1

Privacy-first, local-first cycle tracking mobile app built with Expo Router and React Native.

## Stack

- Expo (Managed Workflow)
- Expo Router
- Zustand
- Expo SQLite
- NativeWind
- Reanimated + Gesture Handler
- Expo Haptics / Network / SecureStore (foundation)

## Folder Structure

```text
app/
  (tabs)/
    _layout.tsx
    index.tsx
    insights.tsx
    profile.tsx
  _layout.tsx
  index.tsx

src/
  components/
    ui/
    charts/
    cards/
  features/
    cycle/
    symptoms/
    insights/
  services/
    syncService/
    encryptionService/
    supabaseService/
  database/
    schema/
    migrations/
    localDB/
  store/
    useCycleStore.ts
    useUserStore.ts
  utils/
  theme/
```

## Implemented in Phase 1

- Dashboard with animated cycle ring
- Daily insight card (placeholder personalization)
- Floating action button for symptom logging
- Mood & energy quick log interactions
- Local-first writes to SQLite + sync queue entries
- Service contracts for sync/encryption/cloud (stubs)
- Light and dark mode UI support

## Run

```bash
npm install
npm run start
```

## Note

Current Node in this environment is below React Native 0.83 recommended engine. Upgrade Node to `>=20.19.4` for best compatibility.

## Production release checklist (Android + iOS + Web)

### 1) Configure env securely (no hardcoded keys in repo)

Create local env for development only:

```bash
cp .env.example .env.local
```

Set EAS project secrets (recommended) so builds do not rely on committed values:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT_REF.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_SUPABASE_ANON_KEY"
```

### 2) Build production apps via Expo/EAS

Android (AAB for Play Store):

```bash
eas build --platform android --profile production
```

iOS (IPA for App Store):

```bash
eas build --platform ios --profile production
```

Project on Expo:

- [Soma Health on Expo](https://expo.dev/accounts/848deepak/projects/soma-health)

### 3) Keep web download up-to-date

The web download button points to `web/public/soma.apk`.

After each Android APK build, replace the file:

```bash
cp android/app/build/outputs/apk/debug/app-debug.apk web/public/soma.apk
```

Then build/deploy web:

```bash
cd web
npm run build
```

### 4) Deploy website on Vercel

This web app uses static export (`output: "export"`), which is fully compatible with Vercel static hosting.

From the `web` folder:

```bash
cd web
npm i -g vercel
vercel
```

When prompted in Vercel CLI:

- Set up and deploy: `Y`
- Link to existing project: choose existing or create new
- Root directory: `web`
- Build command: `npm run build`
- Output directory: `out`

For production deploys:

```bash
cd web
vercel --prod
```

If deploying from GitHub in Vercel dashboard:

- Framework preset: `Next.js`
- Root directory: `web`
- Build command: `npm run build`
- Output directory override: `out`
