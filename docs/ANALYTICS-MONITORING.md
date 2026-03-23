# 📊 Analytics & Monitoring Setup

## Overview

Track downloads, build success rates, and OTA update adoption for your Soma app.

---

## 1️⃣ Download Tracking (Website)

### Google Analytics 4

Add to your website's download button:

```typescript
// web-integration/DownloadButton.tsx (Enhanced)
const handleDownload = () => {
  if (buildData?.apkUrl) {
    // Track download event
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "download_apk", {
        event_category: "app_distribution",
        event_label: `v${buildData.version}`,
        value: buildData.version,
        build_id: buildData.buildId,
      });
    }

    window.open(buildData.apkUrl, "_blank");
  }
};
```

### PostHog (Recommended for product analytics)

```bash
npm install posthog-js
```

```typescript
import posthog from "posthog-js";

// Initialize (in _app.tsx or layout)
posthog.init("YOUR_POSTHOG_KEY", {
  api_host: "https://app.posthog.com",
});

// Track download
const handleDownload = () => {
  posthog.capture("apk_downloaded", {
    version: buildData.version,
    build_id: buildData.buildId,
    platform: "android",
  });

  window.open(buildData.apkUrl, "_blank");
};
```

### Plausible Analytics (Privacy-focused)

```html
<!-- Add to <head> of download page -->
<script
  defer
  data-domain="yourdomain.com"
  src="https://plausible.io/js/script.js"
></script>

<script>
  function handleDownload(apkUrl) {
    // Track event
    plausible("Download APK");

    // Redirect
    window.location.href = apkUrl;
  }
</script>
```

---

## 2️⃣ Build Success Monitoring

### GitHub Actions Status Badge

Add to your README:

```markdown
![Build Status](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/smart-build-deploy.yml/badge.svg)
```

### Slack Notifications

Add to your workflow (`.github/workflows/smart-build-deploy.yml`):

```yaml
# Add at the end of each job
- name: Notify Slack on Success
  if: success()
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "✅ Build Successful!",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Soma Build Complete* ✅\n*Version:* ${{ needs.build-android.outputs.version }}\n*Download:* ${{ needs.build-android.outputs.apk-url }}"
            }
          }
        ]
      }

- name: Notify Slack on Failure
  if: failure()
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "❌ Build Failed - check logs: https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
      }
```

**Setup Slack webhook:**

1. Go to https://api.slack.com/apps
2. Create new app → Incoming Webhooks
3. Add webhook URL to GitHub Secrets as `SLACK_WEBHOOK_URL`

### Discord Notifications

```yaml
- name: Notify Discord
  if: always()
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    title: "Soma App Build"
    description: "Build ${{ job.status }}"
    color: ${{ job.status == 'success' && '0x00FF00' || '0xFF0000' }}
```

---

## 3️⃣ OTA Update Adoption Tracking

### Expo Dashboard (Built-in)

View at: `https://expo.dev/accounts/YOUR_ACCOUNT/projects/soma-health/updates`

Shows:

- Total users on each update
- Update download success rate
- Runtime errors after update
- Rollback metrics

### In-App Tracking

Track when users receive updates:

```typescript
// app/_layout.tsx
import * as Updates from 'expo-updates';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    checkForUpdates();
  }, []);

  async function checkForUpdates() {
    try {
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        console.log('Update available, downloading...');

        // Track update available
        analytics.track('update_available', {
          currentVersion: Updates.manifest?.version,
          updateId: update.manifest?.id
        });

        await Updates.fetchUpdateAsync();

        // Track update downloaded
        analytics.track('update_downloaded', {
          updateId: update.manifest?.id
        });

        // Optionally prompt user to restart
        // Updates.reloadAsync();
      }
    } catch (error) {
      console.error('Error checking for updates:', error);

      // Track update check failure
      analytics.track('update_check_failed', {
        error: error.message
      });
    }
  }

  return (
    // Your app layout
  );
}
```

---

## 4️⃣ Build Metrics Dashboard

### Option A: GitHub Actions Dashboard (Built-in)

View at your repo's Actions tab:

```
https://github.com/YOUR_USERNAME/YOUR_REPO/actions
```

Metrics available:

- Build success/failure rate
- Build duration over time
- Workflow runs history

### Option B: Custom Dashboard with GitHub API

```javascript
// scripts/build-metrics.js
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function getBuildMetrics() {
  const { data: workflows } = await octokit.actions.listWorkflowRunsForRepo({
    owner: "YOUR_USERNAME",
    repo: "YOUR_REPO",
    workflow_id: "smart-build-deploy.yml",
    per_page: 100,
  });

  const total = workflows.workflow_runs.length;
  const successful = workflows.workflow_runs.filter(
    (r) => r.conclusion === "success",
  ).length;
  const failed = workflows.workflow_runs.filter(
    (r) => r.conclusion === "failure",
  ).length;

  const avgDuration =
    workflows.workflow_runs.reduce((sum, run) => {
      const duration = new Date(run.updated_at) - new Date(run.created_at);
      return sum + duration;
    }, 0) / total;

  console.log("📊 Build Metrics (Last 100 runs)");
  console.log("--------------------------------");
  console.log(`Total Builds: ${total}`);
  console.log(`Success Rate: ${((successful / total) * 100).toFixed(1)}%`);
  console.log(`Failed Builds: ${failed}`);
  console.log(`Avg Duration: ${(avgDuration / 1000 / 60).toFixed(1)} minutes`);
}

getBuildMetrics();
```

Run with:

```bash
node scripts/build-metrics.js
```

---

## 5️⃣ Error Monitoring (Sentry)

Your app already has Sentry configured! Enhance it:

### Track Update Errors

```typescript
// app/utils/updates.ts
import * as Updates from "expo-updates";
import * as Sentry from "@sentry/react-native";

export async function checkAndApplyUpdate() {
  try {
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      Sentry.addBreadcrumb({
        category: "update",
        message: "Update available, fetching...",
        level: "info",
      });

      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (error) {
    // Send error to Sentry
    Sentry.captureException(error, {
      tags: {
        feature: "ota-update",
      },
      contexts: {
        update: {
          currentVersion: Updates.manifest?.version,
          channel: Updates.channel,
        },
      },
    });

    throw error;
  }
}
```

---

## 6️⃣ Monitor Build Costs

### Track EAS Build Usage

```bash
# View build usage for current month
eas build:list --limit 100 --json | \
  jq '[.[] | select(.createdAt > "2026-03-01")] | length'

# Estimate costs
# Free tier: 30 builds/month
# Over limit: $1-2 per build OR $29/month unlimited
```

### Optimize Build Frequency

Track which commits trigger builds:

```bash
# Add to workflow
- name: Track Build Trigger
  run: |
    echo "Build triggered by: ${{ github.event.head_commit.message }}"
    echo "Trigger type: ${{ needs.check-build-needed.outputs.should-build }}"

    # Send to analytics
    curl -X POST https://plausible.io/api/event \
      -H 'Content-Type: application/json' \
      -d '{
        "domain": "yourdomain.com",
        "name": "ci_build_triggered",
        "props": {
          "trigger": "${{ needs.check-build-needed.outputs.should-build }}",
          "profile": "${{ needs.check-build-needed.outputs.build-profile }}"
        }
      }'
```

---

## 7️⃣ User Metrics Dashboard

### Track Active Users (In-App)

```typescript
// app/hooks/useAppLifecycle.ts
import { useEffect } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

export function useAppLifecycle() {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        // Track app open
        analytics.track("app_opened", {
          version: Updates.manifest?.version,
          updateId: Updates.updateId,
          channel: Updates.channel,
        });

        // Check for updates
        checkForUpdateAsync();
      }
    });

    return () => subscription.remove();
  }, []);
}
```

### Track App Version Distribution

Create a simple endpoint that apps ping on launch:

```javascript
// build-api/server.js (add endpoint)
app.post("/api/telemetry/app-open", (req, res) => {
  const { version, updateId, platform } = req.body;

  // Store in database or analytics service
  console.log(`App opened: v${version} on ${platform}`);

  // Example: Send to PostHog
  // posthog.capture('app_opened', { version, updateId, platform });

  res.json({ success: true });
});
```

Call from app:

```typescript
// app/utils/telemetry.ts
export async function reportAppOpen() {
  try {
    await fetch("https://your-api.railway.app/api/telemetry/app-open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: Updates.manifest?.version,
        updateId: Updates.updateId,
        platform: Platform.OS,
      }),
    });
  } catch (error) {
    // Fail silently
    console.warn("Telemetry failed:", error);
  }
}
```

---

## 8️⃣ Monitoring Checklist

Set up monitoring for:

- [ ] Website download analytics (Google Analytics / PostHog)
- [ ] EAS build success rate (GitHub Actions / Sentry)
- [ ] OTA update adoption (Expo dashboard)
- [ ] App crash rate (Sentry - already configured)
- [ ] Active users by version (custom telemetry)
- [ ] Build duration trends (GitHub Actions)
- [ ] CI/CD costs (EAS dashboard)

---

## 9️⃣ Alerting

### Critical Alerts (via GitHub Actions)

```yaml
# .github/workflows/smart-build-deploy.yml
# Add to build-android job
- name: Alert on Build Failure
  if: failure()
  run: |
    # Send to PagerDuty / OpsGenie / Email
    curl -X POST https://events.pagerduty.com/v2/enqueue \
      -H 'Content-Type: application/json' \
      -d '{
        "routing_key": "${{ secrets.PAGERDUTY_KEY }}",
        "event_action": "trigger",
        "payload": {
          "summary": "Soma Android build failed",
          "severity": "error",
          "source": "GitHub Actions"
        }
      }'
```

### Weekly Summary Email

Create a weekly cron job:

```yaml
# .github/workflows/weekly-summary.yml
name: Weekly Build Summary

on:
  schedule:
    - cron: "0 9 * * MON" # Every Monday at 9 AM UTC

jobs:
  summary:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Summary
        run: |
          # Fetch build data from last week
          # Generate summary
          # Email via SendGrid / Mailgun / SES
```

---

## 🔍 Useful Monitoring Queries

### EAS Build Stats

```bash
# Total builds this month
eas build:list --limit 1000 --json | \
  jq '[.[] | select(.createdAt > "'$(date -u -d "01 $(date +%B) $(date +%Y)" +"%Y-%m-%d")'")] | length'

# Success rate
eas build:list --limit 100 --json | \
  jq '[.[] | select(.status == "finished")] | length'

# Avg build time (in minutes)
eas build:list --limit 10 --json | \
  jq '[.[] | select(.status == "finished") |
      (((.completedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) / 60) ] |
      add / length | floor'
```

### GitHub Actions Insights

```bash
# View workflow runs
gh run list --workflow=smart-build-deploy.yml --limit 20

# Success rate
gh run list --workflow=smart-build-deploy.yml --limit 100 --json conclusion | \
  jq '[.[] | select(.conclusion == "success")] | length'

# Find slow runs
gh run list --workflow=smart-build-deploy.yml --limit 20 --json durationMs | \
  jq 'sort_by(.durationMs) | reverse | .[0:5] | .[] | {run: .databaseId, minutes: (.durationMs / 60000 | floor)}'
```

---

## 📈 Example Metrics Dashboard

Create a simple metrics page:

```typescript
// web/pages/metrics.tsx
import { useEffect, useState } from 'react';

interface Metrics {
  totalDownloads: number;
  activeVersion: string;
  lastBuildDate: string;
  buildSuccessRate: number;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function fetchMetrics() {
    // Fetch from your analytics service
    const response = await fetch('/api/metrics');
    const data = await response.json();
    setMetrics(data);
  }

  if (!metrics) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-8">
      <MetricCard
        title="Total Downloads"
        value={metrics.totalDownloads}
        icon="📥"
      />
      <MetricCard
        title="Current Version"
        value={metrics.activeVersion}
        icon="📱"
      />
      <MetricCard
        title="Last Build"
        value={new Date(metrics.lastBuildDate).toLocaleDateString()}
        icon="🏗️"
      />
      <MetricCard
        title="Build Success Rate"
        value={`${metrics.buildSuccessRate}%`}
        icon="✅"
      />
    </div>
  );
}

function MetricCard({ title, value, icon }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{title}</div>
    </div>
  );
}
```

---

## 🚨 Production Monitoring Checklist

### Before Launch

- [ ] Download analytics configured (GA4 / PostHog)
- [ ] Build notifications setup (Slack / Email)
- [ ] Sentry error tracking tested
- [ ] EAS dashboard bookmarked
- [ ] Backup plan for build failures documented

### Daily Monitoring

- [ ] Check build success rate (target: >95%)
- [ ] Review Sentry errors (target: <1% error rate)
- [ ] Monitor OTA update adoption (target: >80% within 7 days)

### Weekly Review

- [ ] Analyze download trends
- [ ] Review build costs vs budget
- [ ] Check update distribution across versions
- [ ] Identify and fix recurring build failures

---

## 💡 Advanced: Real-Time Build Status

### Server-Sent Events (SSE) for Live Updates

```javascript
// build-api/server.js (add endpoint)
app.get("/api/builds/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Poll for new builds every 30 seconds
  const interval = setInterval(async () => {
    try {
      const { data } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: "build-artifacts/latest-build.json",
        ref: "main",
      });

      if ("content" in data) {
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        const buildData = JSON.parse(content);

        res.write(`data: ${JSON.stringify(buildData)}\n\n`);
      }
    } catch (error) {
      console.error("SSE error:", error);
    }
  }, 30000);

  req.on("close", () => {
    clearInterval(interval);
  });
});
```

Use in website:

```typescript
// components/LiveBuildStatus.tsx
useEffect(() => {
  const eventSource = new EventSource(
    "https://your-api.railway.app/api/builds/stream",
  );

  eventSource.onmessage = (event) => {
    const buildData = JSON.parse(event.data);
    setBuildData(buildData);
  };

  return () => eventSource.close();
}, []);
```

---

## 📊 Metrics to Track

### Essential Metrics

1. **Download Rate**
   - Unique downloads per day/week/month
   - Download-to-install rate (if measurable)

2. **Build Health**
   - Success rate (target: >95%)
   - Average build time (target: <20 min)
   - Queue time (target: <2 min)

3. **OTA Update Adoption**
   - % of users on latest version
   - Time to 80% adoption (target: <7 days)
   - Update download failures

4. **App Health**
   - Crash-free users (target: >99%)
   - Error rate (target: <1%)
   - Daily active users

### Nice-to-Have Metrics

- Build cost per month
- Storage costs (build artifacts)
- API response times
- Website bounce rate on download page

---

## 🎯 Sample Weekly Report

```
📊 Soma App - Weekly Report (Mar 17-23, 2026)

📱 App Metrics
├─ Downloads: 247 (+45% vs last week)
├─ Active Users: 1,234
├─ Current Version: 89% on v1.2.0, 11% on v1.1.0
└─ Crash-free Rate: 99.7%

🏗️ Build Metrics
├─ Total Builds: 12
├─ Success Rate: 100%
├─ Avg Build Time: 18.3 minutes
└─ Total Build Cost: $4.50

📡 OTA Updates
├─ Updates Published: 8
├─ Update Adoption (7 days): 87%
└─ Download Failures: 0.2%

🐛 Issues
└─ No critical issues this week ✅

💰 Costs
├─ EAS Builds: $4.50
├─ GitHub Actions: $0.12
├─ Hosting: $0.00
└─ Total: $4.62
```

---

## 🔧 Tools for Monitoring

### Free Tools

- GitHub Actions Dashboard (built-in)
- Expo Dashboard (built-in)
- Sentry Free Tier (5k events/month)
- Google Analytics (free)
- Plausible Analytics ($9-90/month, privacy-focused)

### Paid Tools (Optional)

- PostHog ($0-450/month based on usage)
- Datadog ($15/host/month)
- New Relic ($99/month)
- PagerDuty ($21/user/month)

---

## 🎉 Quick Setup

### Minimum Viable Monitoring (5 minutes)

1. **Add GA4 to website**

   ```html
   <!-- Global site tag (gtag.js) - Google Analytics -->
   <script
     async
     src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
   ></script>
   ```

2. **Track downloads**

   ```javascript
   gtag("event", "download", { event_label: "apk" });
   ```

3. **Set up Slack notifications** (add webhook to workflow)

4. **Bookmark EAS dashboard**
   ```
   https://expo.dev/accounts/848deepak/projects/soma-health
   ```

Done! You now have basic monitoring.

---

Last Updated: March 23, 2026
