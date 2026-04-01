const fs = require('node:fs');
const path = require('node:path');

const detoxGlobalTeardown = require('detox/runners/jest/globalTeardown');

const PID_FILE = path.resolve(__dirname, '.metro-e2e.pid');

function stopMetroFromPidFile() {
  if (!fs.existsSync(PID_FILE)) {
    return;
  }

  const raw = fs.readFileSync(PID_FILE, 'utf8').trim();
  const pid = Number(raw);
  if (Number.isFinite(pid) && pid > 0) {
    try {
      // Kill detached process group first.
      process.kill(-pid, 'SIGTERM');
    } catch {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        // Already stopped.
      }
    }
  }

  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    // Ignore cleanup errors.
  }
}

module.exports = async () => {
  await detoxGlobalTeardown();
  stopMetroFromPidFile();
};
