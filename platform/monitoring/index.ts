/**
 * src/platform/monitoring/index.ts
 *
 * Barrel export for monitoring and observability services.
 * Use: import { log, logError, initializeMonitoring } from '@/platform/monitoring';
 */

export {
  log,
  logDebug,
  logInfo,
  logWarn,
  logError,
  logPerformance,
  logAuthEvent,
  logDataEvent,
  logValidationError,
  logUnhandledError,
  initializeMonitoring,
  setMonitoringUserId,
} from './logger';

export type { LogLevel, LogCategory, LogEvent } from './logger';
