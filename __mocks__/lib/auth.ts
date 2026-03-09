// __mocks__/lib/auth.ts
export const getCurrentUser = jest.fn().mockResolvedValue({
  id: 'test-user-id',
  email: null,
  is_anonymous: true,
});

export const ensureAnonymousSession = jest.fn().mockResolvedValue({
  id: 'test-user-id',
  email: null,
  is_anonymous: true,
});

export const signOut = jest.fn().mockResolvedValue(undefined);

export const requireUserId = jest.fn().mockResolvedValue('test-user-id');
