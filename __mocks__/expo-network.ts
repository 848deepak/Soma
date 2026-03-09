// __mocks__/expo-network.ts
export const getNetworkStateAsync = jest.fn().mockResolvedValue({
  isConnected: true,
  isInternetReachable: true,
  type: 'WIFI',
});

export default { getNetworkStateAsync };
