#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const easPath = path.join(process.cwd(), "eas.json");

if (!fs.existsSync(easPath)) {
  console.error("eas.json not found");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(easPath, "utf8"));
const submit = config.submit?.production;

if (!submit) {
  console.log("Release config validation passed (website-only mode: no submit.production required).");
  process.exit(0);
}

const checks = [
  {
    key: "submit.production.ios.appleId",
    value: submit.ios?.appleId,
    invalid: ["YOUR_APPLE_ID", ""],
  },
  {
    key: "submit.production.ios.ascAppId",
    value: submit.ios?.ascAppId,
    invalid: ["YOUR_APP_STORE_CONNECT_APP_ID", ""],
  },
  {
    key: "submit.production.ios.appleTeamId",
    value: submit.ios?.appleTeamId,
    invalid: ["YOUR_APPLE_TEAM_ID", ""],
  },
  {
    key: "submit.production.android.serviceAccountKeyPath",
    value: submit.android?.serviceAccountKeyPath,
    invalid: ["", undefined],
  },
];

const errors = [];
for (const check of checks) {
  if (check.invalid.includes(check.value)) {
    errors.push(`${check.key} is not configured`);
  }
}

if (submit.android?.serviceAccountKeyPath === "./google-play-service-account.json") {
  const keyPath = path.join(process.cwd(), "google-play-service-account.json");
  if (!fs.existsSync(keyPath)) {
    errors.push("google-play-service-account.json is referenced but not present in repository root");
  }
}

if (errors.length > 0) {
  console.error("Release config validation failed:");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log("Release config validation passed.");
