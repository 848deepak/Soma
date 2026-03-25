import { supabase } from "@/lib/supabase";
import {
  getLatestParentalConsent,
  requestParentalConsent,
  verifyParentalConsent,
} from "@/src/services/parentalConsentService";

describe("parentalConsentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests parental consent via edge function", async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: {
        requestId: "req-1",
        expiresAt: "2026-03-31T00:00:00.000Z",
        deduped: false,
        emailSent: true,
      },
      error: null,
    });

    const result = await requestParentalConsent(
      "child-id",
      "Parent@Example.com",
      "2015-01-20",
    );

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "request-parental-consent",
      {
        body: {
          parentEmail: "parent@example.com",
          childDateOfBirth: "2015-01-20",
        },
      },
    );

    expect(result).toEqual({
      requestId: "req-1",
      expiresAt: "2026-03-31T00:00:00.000Z",
      deduped: false,
      emailSent: true,
    });
  });

  it("throws when request function fails", async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: "boom" },
    });

    await expect(
      requestParentalConsent("child-id", "parent@example.com"),
    ).rejects.toThrow("boom");
  });

  it("verifies parental consent via verify function", async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: { verified: true },
      error: null,
    });

    await expect(verifyParentalConsent("token")).resolves.toEqual({ verified: true });
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "verify-parental-consent",
      { body: { token: "token" } },
    );
  });

  it("returns latest parental consent record", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "pc-1",
        child_id: "child-id",
        parent_email: "parent@example.com",
        status: "pending",
        requested_at: "2026-03-25T00:00:00.000Z",
        expires_at: "2026-04-01T00:00:00.000Z",
        verified_at: null,
        revoked_at: null,
      },
      error: null,
    });

    const chain: Record<string, jest.Mock> = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle,
    };

    (supabase.from as jest.Mock).mockReturnValueOnce(chain);

    const result = await getLatestParentalConsent("child-id");
    expect(result?.id).toBe("pc-1");
    expect(chain.eq).toHaveBeenCalledWith("child_id", "child-id");
  });
});
