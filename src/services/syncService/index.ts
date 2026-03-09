import * as Network from 'expo-network';

export async function canSync() {
  const state = await Network.getNetworkStateAsync();
  return Boolean(state.isConnected && state.isInternetReachable);
}

/**
 * @deprecated Use OfflineSyncService.flushOfflineQueue() for the real sync logic.
 * This stub is kept only so existing test mocks don't break.
 */
export async function flushSyncQueue() {
  if (!(await canSync())) {
    return { synced: 0, skipped: true };
  }
  return { synced: 0, skipped: false };
}
