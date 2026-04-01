const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");
import type { SupabaseClient } from "@supabase/supabase-js";

function parseEnvFile(content: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function loadLocalEnvFallback() {
  for (const filename of [".env.local", ".env"]) {
    const envPath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(envPath)) continue;
    const parsed = parseEnvFile(fs.readFileSync(envPath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

async function isVisibleById(id: string, timeoutMs: number): Promise<boolean> {
  try {
    await waitFor(element(by.id(id)))
      .toBeVisible()
      .withTimeout(timeoutMs);
    return true;
  } catch {
    return false;
  }
}

async function isVisibleByText(
  text: string,
  timeoutMs: number,
): Promise<boolean> {
  try {
    await waitFor(element(by.text(text)))
      .toBeVisible()
      .withTimeout(timeoutMs);
    return true;
  } catch {
    return false;
  }
}

async function cleanupUserData(
  client: SupabaseClient,
  userId: string,
): Promise<void> {
  await client.from("daily_logs").delete().eq("user_id", userId);
  await client.from("cycles").delete().eq("user_id", userId);
}

async function ensureActiveCycle(
  client: SupabaseClient,
  userId: string,
  date: string,
): Promise<void> {
  const existing = await client
    .from("cycles")
    .select("id")
    .eq("user_id", userId)
    .is("end_date", null)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`Failed to query active cycle: ${existing.error.message}`);
  }

  if (existing.data?.id) {
    return;
  }

  const insert = await client.from("cycles").insert({
    user_id: userId,
    start_date: date,
    current_phase: "menstrual",
  });

  if (insert.error) {
    throw new Error(
      `Failed to create active cycle for Detox flow: ${insert.error.message}`,
    );
  }
}

describe("Real Backend Detox Journey", () => {
  let supabase: SupabaseClient;
  let userId: string;
  let testEmail: string;
  let testPassword: string;

  beforeAll(async () => {
    loadLocalEnvFallback();

    const url =
      process.env.SUPABASE_TEST_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey =
      process.env.SUPABASE_TEST_ANON_KEY ??
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    testEmail = process.env.SUPABASE_TEST_USER_EMAIL ?? "";
    testPassword = process.env.SUPABASE_TEST_PASSWORD ?? "";

    if (!url || !anonKey || !testEmail || !testPassword) {
      throw new Error(
        "Missing required real backend env vars for Detox: SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, SUPABASE_TEST_USER_EMAIL, SUPABASE_TEST_PASSWORD.",
      );
    }

    supabase = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });

    const signIn = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signIn.error || !signIn.data.user?.id) {
      throw new Error(
        `Failed to sign in test user for Detox validation: ${signIn.error?.message}`,
      );
    }

    userId = signIn.data.user.id;
    await cleanupUserData(supabase, userId);
  });

  afterAll(async () => {
    await cleanupUserData(supabase, userId);
    await supabase.auth.signOut();
    await device.terminateApp();
  });

  it("logs in, writes data through UI, and verifies persistence in Supabase", async () => {
    const date = todayIso();

    await ensureActiveCycle(supabase, userId, date);

    await device.launchApp({ newInstance: true, delete: true });
    await device.disableSynchronization();

    const homeVisibleEarly = await isVisibleByText("Log Period", 70000);

    if (!homeVisibleEarly) {
      const hasEmailInput = await isVisibleById("email-input", 12000);

      if (!hasEmailInput) {
        const hasWelcomeSignInLink = await isVisibleByText(
          "Already have an account? Sign in",
          15000,
        );
        if (hasWelcomeSignInLink) {
          await element(by.text("Already have an account? Sign in")).tap();
        }
      }

      await waitFor(element(by.id("email-input")))
        .toBeVisible()
        .withTimeout(50000);
      await element(by.id("email-input")).replaceText(testEmail);
      await element(by.id("password-input")).replaceText(testPassword);
      await element(by.id("primary-button")).tap();
    }

    // Handle optional welcome step for onboarded users.
    try {
      await waitFor(element(by.text("Go to Home")))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.text("Go to Home")).tap();
    } catch {
      // If the account is not onboarded, this flow is not suitable for strict production validation.
      try {
        await waitFor(element(by.text("Get Started")))
          .toBeVisible()
          .withTimeout(2000);
        throw new Error(
          "Detox real-backend flow requires an onboarded test user. Current user landed on onboarding (Get Started).",
        );
      } catch {
        // No welcome gate shown; continue.
      }
    }

    await waitFor(element(by.id("home-log-primary-button")))
      .toBeVisible()
      .withTimeout(30000);
    await element(by.id("home-log-primary-button")).tap();
    await waitFor(element(by.text("Save Log")))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.text("Save Log")).tap();

    await waitFor(element(by.id("home-log-primary-button")))
      .toBeVisible()
      .withTimeout(15000);

    const dailyLog = await supabase
      .from("daily_logs")
      .select("id, user_id, date")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    expect(dailyLog.error).toBeNull();
    expect(dailyLog.data?.user_id).toBe(userId);
    expect(dailyLog.data?.date).toBe(date);

    await device.enableSynchronization();
  });
});
