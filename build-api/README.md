# Build Distribution API

Simple Express API for serving build metadata and direct downloads.

## Setup

```bash
cd build-api
npm install
```

## Configuration

Create `.env` file:

```env
PORT=3001
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo
GITHUB_TOKEN=ghp_xxxxxxxxxxxx  # Optional, for higher rate limits
```

## Run Locally

```bash
npm run dev
```

## Deploy

### Railway

```bash
railway init
railway up
railway open
```

### Render

1. Create new Web Service
2. Connect your GitHub repo
3. Set root directory to `build-api`
4. Add environment variables
5. Deploy!

### Vercel

```bash
vercel
```

## Endpoints

- `GET /api/latest-build` - Returns latest build metadata JSON
- `GET /api/builds/history` - Returns last 10 builds
- `GET /download` - Redirects to latest APK download
- `GET /api/health` - Health check

## Usage in Your Website

```javascript
// Fetch latest build
const response = await fetch("https://your-api.railway.app/api/latest-build");
const { data } = await response.json();
console.log(data.apkUrl); // Direct download link

// Direct download link (shortcut)
<a href="https://your-api.railway.app/download">Download App</a>;
```
