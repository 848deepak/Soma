// Simple Express API to serve latest build metadata
// Can be deployed to Railway, Render, Heroku, etc.

import { Octokit } from "@octokit/rest";
import cors from "cors";
import express from "express";
import util from "node:util";

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

function logInfo(message) {
  process.stdout.write(`${message}\n`);
}

function logError(message, error) {
  const details = error ? ` ${util.format(error)}` : "";
  process.stderr.write(`${message}${details}\n`);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toLocalDateIso(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseCalendarText(input) {
  const text = String(input || "").trim();
  const lower = text.toLowerCase();
  const now = new Date();
  const date = lower.includes("tomorrow")
    ? toLocalDateIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
    : toLocalDateIso(now);

  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  let startTime = "09:00";
  if (timeMatch) {
    let hour = Number(timeMatch[1]) % 12;
    if (timeMatch[3].toLowerCase() === "pm") hour += 12;
    startTime = `${pad2(hour)}:${pad2(Number(timeMatch[2] || "0"))}`;
  }

  const endHour = (Number(startTime.slice(0, 2)) + 1) % 24;
  const endTime = `${pad2(endHour)}:${startTime.slice(3, 5)}`;

  return {
    title: text.replace(/\b(today|tomorrow|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/gi, "").trim() || "Untitled event",
    date,
    startTime,
    endTime,
    location: null,
    participants: [],
    tags: [],
    recurrence: null,
    confidence: 0.75,
    needsReview: true,
  };
}

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
    logError("Error fetching build metadata:", error);
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
        } catch {
          return null;
        }
      }),
    );

    return res.json({
      success: true,
      data: builds.filter(Boolean),
    });
  } catch (error) {
    logError("Error fetching build history:", error);
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
// SMART CALENDAR API EXAMPLES
// ===========================

app.post("/api/calendar/parse", (req, res) => {
  const text = req.body?.text;
  if (!text || typeof text !== "string") {
    return res.status(400).json({
      success: false,
      error: "text is required",
    });
  }

  return res.json({
    success: true,
    data: parseCalendarText(text),
    parser: "inbuilt-rule-engine",
  });
});

app.get("/api/calendar/events", (req, res) => {
  return res.json({
    success: true,
    data: {
      start: req.query.start ?? null,
      end: req.query.end ?? null,
      types: req.query.types ?? "all",
      events: [],
    },
  });
});

app.post("/api/calendar/events", (req, res) => {
  const { title, startTime, endTime, type = "manual" } = req.body ?? {};
  if (!title || !startTime || !endTime) {
    return res.status(400).json({
      success: false,
      error: "title, startTime, and endTime are required",
    });
  }

  return res.status(201).json({
    success: true,
    data: {
      id: `evt_${Date.now()}`,
      title,
      startTime,
      endTime,
      type,
      tags: req.body?.tags ?? [],
      recurrence: req.body?.recurrence ?? null,
      metadata: req.body?.metadata ?? {},
    },
  });
});

app.get("/api/calendar/today", (req, res) => {
  return res.json({
    success: true,
    data: {
      today: toLocalDateIso(new Date()),
      events: [],
      tomorrowPreview: [],
      highlights: [],
    },
  });
});

app.get("/api/calendar/suggestions", (req, res) => {
  return res.json({
    success: true,
    data: [
      {
        id: "habit-workout-7am",
        title: "You usually workout at 7 AM, schedule it?",
        source: "habit",
        confidence: 0.82,
      },
    ],
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
    logError("Error redirecting to APK:", error);
    return res.status(404).json({
      success: false,
      error: "APK not found",
    });
  }
});

app.listen(PORT, () => {
  logInfo(`Build API running on port ${PORT}`);
  logInfo(`Serving builds for ${GITHUB_OWNER}/${GITHUB_REPO}`);
});

export default app;
