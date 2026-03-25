// __mocks__/expo-network.ts
export const getNetworkStateAsync = jest.fn().mockResolvedValue({
  isConnected: true,
  isInternetReachable: true,
  type: 'WIFI',
});

export const addNetworkStateListener = jest.fn().mockImplementation(() => ({
  remove: jest.fn(),
}));

export default { getNetworkStateAsync, addNetworkStateListener };
