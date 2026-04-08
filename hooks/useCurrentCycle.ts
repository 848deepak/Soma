/**
 * hooks/useCurrentCycle.ts (DEPRECATED)
 *
 * BACKWARD COMPATIBILITY SHIM - Remove after 2 weeks (target: 2026-04-21)
 *
 * This file is deprecated. New code should import from the domain:
 *   import { useCurrentCycle } from '@/domain/cycle';
 *
 * Old import (deprecated but still works):
 *   import { useCurrentCycle } from '@/hooks/useCurrentCycle';
 */

export * from '../src/domain/cycle/hooks/useCurrentCycle';
