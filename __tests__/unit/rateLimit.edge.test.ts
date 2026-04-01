import {
  __resetRateLimitBucketsForTests,
  enforceRateLimit,
} from "../../supabase/functions/_shared/rate-limit";

describe("edge rate limiter", () => {
  beforeEach(() => {
    __resetRateLimitBucketsForTests();
  });

  it("allows requests within limit", () => {
    const req = new Request("https://example.com/functions/v1/sync-push-token", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
    });

    expect(
      enforceRateLimit(req, {
        scope: "sync-push-token",
        limit: 2,
        windowMs: 1000,
      }),
    ).toBeNull();

    expect(
      enforceRateLimit(req, {
        scope: "sync-push-token",
        limit: 2,
        windowMs: 1000,
      }),
    ).toBeNull();
  });

  it("returns 429 when limit is exceeded", async () => {
    const req = new Request("https://example.com/functions/v1/sync-push-token", {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
    });

    enforceRateLimit(req, {
      scope: "sync-push-token",
      limit: 1,
      windowMs: 1000,
    });

    const blocked = enforceRateLimit(req, {
      scope: "sync-push-token",
      limit: 1,
      windowMs: 1000,
    });

    expect(blocked?.status).toBe(429);

    const payload = await blocked?.json();
    expect(payload?.error).toMatch(/too many requests/i);
  });
});
