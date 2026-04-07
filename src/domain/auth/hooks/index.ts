/**
 * src/domain/auth/hooks/index.ts
 *
 * Barrel export for auth hooks.
 * Use: import { useAuth, useProfile } from '@/domain/auth/hooks';
 */

export { useAuth } from './useAuth';
export type { AuthState } from './useAuth';

export { useProfile } from './useProfile';
export type { ProfileQuery } from './useProfile';
