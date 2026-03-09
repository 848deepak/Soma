// __mocks__/expo-sqlite.ts
const mockRun = jest.fn().mockResolvedValue(undefined);
const mockGetFirst = jest.fn().mockResolvedValue(null);
const mockGetAll = jest.fn().mockResolvedValue([]);
const mockExec = jest.fn().mockResolvedValue(undefined);

const mockDb = {
  runAsync: mockRun,
  getFirstAsync: mockGetFirst,
  getAllAsync: mockGetAll,
  execAsync: mockExec,
};

export const openDatabaseAsync = jest.fn().mockResolvedValue(mockDb);

export default { openDatabaseAsync };
