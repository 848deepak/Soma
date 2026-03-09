// __mocks__/lib/supabase.ts
// Fluent mock of the Supabase client for unit/integration tests.

type MockQueryResult = { data: unknown; error: null | { message: string } };

function makeMockQuery(result: MockQueryResult) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'is', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'order', 'limit', 'single', 'maybeSingle', 'or'];
  methods.forEach((method) => {
    chain[method] = jest.fn().mockReturnValue(chain);
  });
  // Terminal methods return the result
  chain['single'] = jest.fn().mockResolvedValue(result);
  chain['maybeSingle'] = jest.fn().mockResolvedValue(result);
  chain['then'] = jest.fn((resolve: (v: MockQueryResult) => void) => {
    resolve(result);
    return { catch: jest.fn() };
  });
  // Make the chain itself awaitable
  Object.defineProperty(chain, Symbol.iterator, { value: undefined });
  return chain;
}

// Store for test control – tests can override these
export const __mockQueryResult: MockQueryResult = { data: null, error: null };
export const __setMockQueryResult = (result: MockQueryResult) => {
  Object.assign(__mockQueryResult, result);
};

const buildChainedMock = () => {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'is', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'or', 'order', 'limit'];
  methods.forEach((method) => {
    chain[method] = jest.fn().mockReturnValue(chain);
  });
  chain['maybeSingle'] = jest.fn().mockResolvedValue({ data: null, error: null });
  chain['single'] = jest.fn().mockResolvedValue({ data: null, error: null });
  chain['insert'] = jest.fn().mockResolvedValue({ data: null, error: null });
  chain['upsert'] = jest.fn().mockResolvedValue({ data: null, error: null });
  chain['update'] = jest.fn().mockResolvedValue({ data: null, error: null });
  chain['delete'] = jest.fn().mockResolvedValue({ data: null, error: null });
  return chain;
};

const mockFrom = jest.fn().mockImplementation(() => buildChainedMock());

const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });

const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
};
const mockRemoveChannel = jest.fn().mockResolvedValue(undefined);

export const supabase = {
  from: mockFrom,
  rpc: mockRpc,
  channel: jest.fn().mockReturnValue(mockChannel),
  removeChannel: mockRemoveChannel,
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInAnonymously: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' }, session: { access_token: 'test-token' } },
      error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' }, session: { access_token: 'test-token' } },
      error: null,
    }),
    signUp: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' }, session: null },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
  },
};

export default supabase;
