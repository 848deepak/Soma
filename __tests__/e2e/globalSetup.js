const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { execSync, spawn } = require("node:child_process");

const detoxGlobalSetup = require("detox/runners/jest/globalSetup");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const PID_FILE = path.resolve(__dirname, ".metro-e2e.pid");
const LOG_FILE = path.resolve(__dirname, ".metro-e2e.log");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isMetroReady() {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:8081/status", (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += String(chunk);
      });
      res.on("end", () => {
        resolve(body.includes("packager-status:running"));
      });
    });

    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForMetroReady(timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isMetroReady()) {
      return;
    }
    await sleep(1000);
  }
  throw new Error("Metro did not become ready in time for Detox E2E startup.");
}

function stopExistingPackagers() {
  try {
    execSync('pkill -f "expo|metro"', {
      stdio: "ignore",
    });
  } catch {
    // No running packager is fine.
  }
}

function startMetro() {
  const metroLogFd = fs.openSync(LOG_FILE, "a");

  const metroProcess = spawn(
    "npx",
    [
      "expo",
      "start",
      "--dev-client",
      "--host",
      "localhost",
      "--port",
      "8081",
      "--clear",
    ],
    {
      cwd: PROJECT_ROOT,
      detached: true,
      stdio: ["ignore", metroLogFd, metroLogFd],
      env: {
        ...process.env,
        NODE_ENV: "development",
        BABEL_ENV: "development",
        EXPO_NO_TELEMETRY: "1",
        CI: "1",
      },
    },
  );

  metroProcess.unref();
  fs.writeFileSync(PID_FILE, String(metroProcess.pid), "utf8");
}

module.exports = async () => {
  if (await isMetroReady()) {
    await detoxGlobalSetup();
    return;
  }

  stopExistingPackagers();
  startMetro();
  await waitForMetroReady();
  await detoxGlobalSetup();
};
