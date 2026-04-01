// Lightweight per-instance rate limiter for Supabase Edge Functions.
// Note: This guards abuse spikes but is not a distributed global limiter.

type RateLimitOptions = {
  scope: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

function getClientIdentifier(req: Request): string {
  const auth = req.headers.get("authorization")?.trim();
  if (auth) return `auth:${auth.slice(0, 40)}`;

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return `ip:${forwarded}`;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return `ip:${realIp}`;

  return "client:unknown";
}

function buildRateHeaders(
  limit: number,
  remaining: number,
  resetAt: number,
  retryAfterSec = 0,
): HeadersInit {
  const resetEpochSec = Math.max(0, Math.floor(resetAt / 1000));
  return {
    "Content-Type": "application/json",
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(resetEpochSec),
    "Retry-After": String(Math.max(0, retryAfterSec)),
  };
}

export function enforceRateLimit(
  req: Request,
  options: RateLimitOptions,
): Response | null {
  if (req.method === "OPTIONS") {
    return null;
  }

  const now = Date.now();
  const clientKey = getClientIdentifier(req);
  const key = `${options.scope}:${clientKey}`;
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return null;
  }

  if (existing.count >= options.limit) {
    const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: buildRateHeaders(options.limit, 0, existing.resetAt, retryAfterSec),
      },
    );
  }

  existing.count += 1;
  buckets.set(key, existing);
  return null;
}

export function __resetRateLimitBucketsForTests(): void {
  buckets.clear();
}
