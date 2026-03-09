// __mocks__/@react-native-async-storage/async-storage.ts
const storage: Record<string, string> = {};

export default {
  getItem: jest.fn(async (key: string) => storage[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete storage[key];
  }),
  clear: jest.fn(async () => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  }),
  getAllKeys: jest.fn(async () => Object.keys(storage)),
  multiGet: jest.fn(async (keys: string[]) =>
    keys.map((key) => [key, storage[key] ?? null] as [string, string | null]),
  ),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => {
      storage[key] = value;
    });
  }),
};
