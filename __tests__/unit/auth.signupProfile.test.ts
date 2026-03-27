import { supabase } from "@/lib/supabase";

import { signUpWithEmail } from "../../lib/auth";

type QueryResult = { data: unknown; error: unknown };

function createProfileChain(options: {
  profileChecks: QueryResult[];
  insertResult?: QueryResult;
}) {
  const checks = [...options.profileChecks];
  const insertResult = options.insertResult ?? { data: null, error: null };

  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockImplementation(async () => {
      if (checks.length > 0) {
        return checks.shift();
      }
      return { data: null, error: null };
    }),
    insert: jest.fn().mockResolvedValue(insertResult),
  };
}

describe("signUpWithEmail profile reconciliation", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("completes signup when profile appears on retry", async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const profilesChain = createProfileChain({
      profileChecks: [
        { data: null, error: null },
        { data: null, error: null },
        { data: { id: "user-123" }, error: null },
      ],
    });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "profiles") return profilesChain;
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(signUpWithEmail("new@example.com", "password1")).resolves.toEqual(
      { id: "user-123" },
    );

    expect(profilesChain.insert).not.toHaveBeenCalled();
  });

  it("should recover when fallback profile insert collides with trigger-created row", async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-456" } },
      error: null,
    });

    const duplicateError = {
      message: 'duplicate key value violates unique constraint "profiles_pkey"',
      code: "23505",
    };

    const profilesChain = createProfileChain({
      profileChecks: [
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: { id: "user-456" }, error: null },
      ],
      insertResult: { data: null, error: duplicateError },
    });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "profiles") return profilesChain;
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(signUpWithEmail("new@example.com", "password1")).resolves.toEqual(
      { id: "user-456" },
    );

    expect(profilesChain.insert).toHaveBeenCalledTimes(1);
  });

  it("does not fail signup when profile verification is blocked by RLS permissions", async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: { id: "user-789" }, session: null },
      error: null,
    });

    const permissionError = {
      message: "permission denied for table profiles",
      code: "42501",
    };

    const profilesChain = createProfileChain({
      profileChecks: [{ data: null, error: permissionError }],
    });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "profiles") return profilesChain;
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(signUpWithEmail("new@example.com", "password1")).resolves.toEqual(
      { id: "user-789" },
    );

    expect(profilesChain.insert).not.toHaveBeenCalled();
  });
});
