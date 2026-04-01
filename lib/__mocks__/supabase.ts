// lib/__mocks__/supabase.ts
// Manual mock for @/lib/supabase
// Activate with jest.mock('@/lib/supabase') in test files

const buildChainedMock = (overrideResult?: { data: unknown; error: unknown }) => {
  const result = overrideResult ?? { data: null, error: null };
  const chain: Record<string, jest.MockedFunction<() => unknown>> = {};

  const terminalMethods = ['maybeSingle', 'single'];
  const chainMethods = ['select', 'is', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'or', 'order', 'limit', 'not'];

  chainMethods.forEach((method) => {
    chain[method] = jest.fn().mockReturnValue(chain);
  });

  terminalMethods.forEach((method) => {
    chain[method] = jest.fn().mockResolvedValue(result);
  });

  // Also support direct resolution for insert/update/delete/upsert
  chain['insert'] = jest.fn().mockResolvedValue(result);
  chain['upsert'] = jest.fn().mockResolvedValue(result);
  chain['update'] = jest.fn().mockResolvedValue(result);
  chain['delete'] = jest.fn().mockResolvedValue(result);

  return chain;
};

const mockChannelInstance = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
};

export const supabase = {
  from: jest.fn().mockImplementation(() => buildChainedMock()),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  functions: {
    invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
  channel: jest.fn().mockReturnValue(mockChannelInstance),
  removeChannel: jest.fn().mockResolvedValue('ok'),
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInAnonymously: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', is_anonymous: true }, session: { access_token: 'tok' } },
      error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' }, session: { access_token: 'tok' } },
      error: null,
    }),
    signUp: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' }, session: null },
      error: null,
    }),
    updateUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com', is_anonymous: false } },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
  },
};

// Helper to configure a specific from() result for testing
export const mockFromResult = (data: unknown, error: unknown = null) => {
  (supabase.from as jest.Mock).mockImplementation(() => buildChainedMock({ data, error }));
};

export const resetSupabaseMocks = () => {
  jest.clearAllMocks();
  (supabase.from as jest.Mock).mockImplementation(() => buildChainedMock());
};
