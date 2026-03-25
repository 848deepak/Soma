# Secrets Management

## Principles
- Never commit real secrets to source control.
- Keep local values in untracked files only.
- Use platform secret stores for production.

## Local Development
- Copy `.env.example` to `.env.local` and set local values.
- Copy `supabase/.env.secrets.example` to `supabase/.env.secrets.local`.
- Apply edge function secrets with:

```bash
npx supabase secrets set --env-file supabase/.env.secrets.local --project-ref <project-ref>
```

## Production App Builds (EAS)
Set build-time variables in GitHub Actions Secrets or EAS project secrets:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_ENV=production`
- Optional: `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_API_KEY`

Also configure CI auth:
- `EXPO_TOKEN`

Run preflight validation before build:

```bash
./scripts/verify-secrets.sh production
npm run release:verify-config
npm run release:dry-run
```

Build both website artifacts in one command:

```bash
npm run release:build-artifacts
```

Final files are downloaded to `dist/releases/soma-health.apk` and `dist/releases/soma-health.ipa`.

## Website-Only Distribution
- Android artifact: `soma-health.apk` published to GitHub Releases.
- iOS artifact: `soma-health.ipa` published to GitHub Releases.
- Website download page consumes `web/public/download.json` and links directly to release assets.

For iOS website installs, users need an iOS-compatible installation workflow (for example Apple Configurator 2, MDM, or enterprise/internal signing path).

## Web Download Metadata
`web/public/download.json` supports:
- `downloadUrl` or `apkUrl` for Android direct download
- `iosIpaUrl` for direct iOS IPA download

## Rotation Playbook
1. Revoke leaked credential in provider dashboard.
2. Create replacement credential.
3. Update secret store (GitHub/EAS/Supabase).
4. Redeploy affected services.
5. Confirm old credential is invalid.
