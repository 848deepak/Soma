// Simple Express API to serve latest build metadata
// Can be deployed to Railway, Render, Heroku, etc.

import { Octokit } from "@octokit/rest";
import cors from "cors";
import express from "express";

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS for your website domain
app.use(
  cors({
    origin: ["https://yourdomain.com", "http://localhost:3000"],
  }),
);

app.use(express.json());

// GitHub configuration
const GITHUB_OWNER = process.env.GITHUB_OWNER || "YOUR_GITHUB_USERNAME";
const GITHUB_REPO = process.env.GITHUB_REPO || "YOUR_GITHUB_REPO";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Optional, for higher rate limits

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

// ===========================
// GET /api/latest-build
// Returns latest build metadata
// ===========================
app.get("/api/latest-build", async (req, res) => {
  try {
    // Fetch latest-build.json from GitHub
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: "build-artifacts/latest-build.json",
      ref: "main",
    });

    if ("content" in data) {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const buildData = JSON.parse(content);

      return res.json({
        success: true,
        data: buildData,
      });
    }

    throw new Error("File not found");
  } catch (error) {
    console.error("Error fetching build metadata:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch latest build metadata",
    });
  }
});

// ===========================
// GET /api/builds/history
// Returns build history (last 10 builds)
// ===========================
app.get("/api/builds/history", async (req, res) => {
  try {
    // Fetch commits that updated latest-build.json
    const { data: commits } = await octokit.repos.listCommits({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: "build-artifacts/latest-build.json",
      per_page: 10,
    });

    const builds = await Promise.all(
      commits.map(async (commit) => {
        try {
          const { data: fileData } = await octokit.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: "build-artifacts/latest-build.json",
            ref: commit.sha,
          });

          if ("content" in fileData) {
            const content = Buffer.from(fileData.content, "base64").toString(
              "utf-8",
            );
            return JSON.parse(content);
          }
        } catch (error) {
          return null;
        }
      }),
    );

    return res.json({
      success: true,
      data: builds.filter(Boolean),
    });
  } catch (error) {
    console.error("Error fetching build history:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch build history",
    });
  }
});

// ===========================
// GET /api/health
// Health check endpoint
// ===========================
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// ===========================
// GET /download
// Redirect directly to latest APK
// ===========================
app.get("/download", async (req, res) => {
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

      if (buildData.apkUrl) {
        return res.redirect(buildData.apkUrl);
      }
    }

    throw new Error("APK URL not found");
  } catch (error) {
    console.error("Error redirecting to APK:", error);
    return res.status(404).json({
      success: false,
      error: "APK not found",
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Build API running on port ${PORT}`);
  console.log(`📦 Serving builds for ${GITHUB_OWNER}/${GITHUB_REPO}`);
});

export default app;
