# 🚂 Deploy Build API to Railway

## Quick Deploy (2 minutes)

### Step 1: Install Railway CLI

```bash
npm install -g railway
```

### Step 2: Login

```bash
railway login
```

### Step 3: Deploy

```bash
cd build-api
railway init
railway up
```

### Step 4: Set Environment Variables

```bash
railway variables set GITHUB_OWNER=your-username
railway variables set GITHUB_REPO=your-repo
railway variables set GITHUB_TOKEN=ghp_optional
```

### Step 5: Get Your API URL

```bash
railway open
# Copy the URL (e.g., https://your-app.railway.app)
```

---

# ▲ Deploy Build API to Vercel

## Quick Deploy (2 minutes)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Deploy

```bash
cd build-api
vercel
```

Follow prompts:

- Setup and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **N**
- What's your project's name? **soma-build-api**
- In which directory is your code located? **./**

### Step 3: Set Environment Variables

```bash
vercel env add GITHUB_OWNER
# Enter: your-username

vercel env add GITHUB_REPO
# Enter: your-repo

vercel env add GITHUB_TOKEN
# Enter: ghp_token (optional)
```

### Step 4: Deploy to Production

```bash
vercel --prod
```

---

# 🎨 Deploy to Render.com

## Via Dashboard (3 minutes)

### Step 1: Create New Web Service

1. Go to https://render.com/
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository

### Step 2: Configure

- **Name:** soma-build-api
- **Root Directory:** `build-api`
- **Environment:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### Step 3: Add Environment Variables

Click **"Environment"** tab, add:

- `GITHUB_OWNER` = your-username
- `GITHUB_REPO` = your-repo
- `GITHUB_TOKEN` = ghp_token (optional)

### Step 4: Deploy

Click **"Create Web Service"**

Service will be live at: `https://soma-build-api.onrender.com`

---

# 🐳 Deploy with Docker (Advanced)

## Dockerfile

Create `build-api/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server.js ./

EXPOSE 3001

CMD ["node", "server.js"]
```

## Deploy

```bash
# Build image
docker build -t soma-build-api ./build-api

# Run locally
docker run -p 3001:3001 \
  -e GITHUB_OWNER=your-username \
  -e GITHUB_REPO=your-repo \
  soma-build-api

# Deploy to any Docker hosting (Fly.io, AWS ECS, Google Cloud Run, etc.)
```

---

# 🔗 Update Website to Use API

After deploying, update your website:

## React/Next.js Component

```typescript
// Change this line in DownloadButton.tsx:
const response = await fetch(
  "https://your-api.railway.app/api/latest-build", // Your API URL
);
```

## HTML Page

```javascript
// Change this line in download-apk.html:
const BUILD_METADATA_URL = "https://your-api.railway.app/api/latest-build";
```

## Simple Download Link

```html
<!-- Direct download link -->
<a href="https://your-api.railway.app/download"> Download Latest APK </a>
```

---

# 🎯 API Endpoints Reference

Once deployed, your API provides:

### `GET /api/latest-build`

Returns latest build metadata

```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "apkUrl": "https://expo.dev/artifacts/eas/xyz.apk",
    "buildDate": "2026-03-23T10:30:00Z"
  }
}
```

### `GET /api/builds/history`

Returns last 10 builds

```json
{
  "success": true,
  "data": [
    { "version": "1.0.0", "apkUrl": "..." },
    { "version": "0.9.0", "apkUrl": "..." }
  ]
}
```

### `GET /download`

Redirects to latest APK (use for direct download links)

### `GET /api/health`

Health check

```json
{
  "status": "healthy",
  "timestamp": "2026-03-23T10:30:00Z"
}
```

---

# 💡 When to Deploy API vs Use GitHub Raw

## Use GitHub Raw (No API needed) when:

- ✅ Simple website
- ✅ Low traffic (<1000 downloads/day)
- ✅ No analytics needed
- ✅ Want zero maintenance

## Deploy API when:

- ✅ Need download analytics
- ✅ Want custom logic (A/B testing, feature flags)
- ✅ High traffic (>1000 req/hr - GitHub rate limits)
- ✅ Need build history endpoint
- ✅ Want clean URLs (`/download` instead of GitHub raw)

---

# 🆓 Cost Comparison

| Platform    | Free Tier                  | After Free Tier    |
| ----------- | -------------------------- | ------------------ |
| **Railway** | $5 credit/month (~500 hrs) | $0.000463/GB-hr    |
| **Vercel**  | 100 GB-hrs/month           | $20/month pro      |
| **Render**  | 750 hrs/month              | $7/month           |
| **Fly.io**  | 3 shared-cpu apps          | $1.94/month per VM |

**Recommendation:** Start with Railway (most generous free tier)

---

# 🎉 You're Done!

Your build API is now deployed and ready to serve APK downloads!

Test it:

```bash
curl https://your-api.railway.app/api/health
curl https://your-api.railway.app/api/latest-build
```
