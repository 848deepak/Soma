// lib/__mocks__/auth.ts
// Manual mock for @/lib/auth
// Activate with jest.mock('@/lib/auth') in test files

const mockUser = {
  id: 'test-user-id',
  email: null,
  is_anonymous: true,
  aud: 'authenticated',
  role: 'anon',
};

const mockEmailUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  is_anonymous: false,
  aud: 'authenticated',
  role: 'authenticated',
};

export const getCurrentUser = jest.fn().mockResolvedValue(mockUser);

export const ensureProfileRow = jest.fn().mockResolvedValue(undefined);

export const ensureAnonymousSession = jest.fn().mockResolvedValue(mockUser);

export const getProfile = jest.fn().mockResolvedValue(null);

export const signUpWithEmail = jest.fn().mockResolvedValue(mockEmailUser);

export const signInWithEmail = jest.fn().mockResolvedValue(mockEmailUser);

export const resetPassword = jest.fn().mockResolvedValue(undefined);

export const signOut = jest.fn().mockResolvedValue(undefined);

export const requireUserId = jest.fn().mockResolvedValue('test-user-id');
