// __mocks__/expo-import-meta-registry.ts
// Mock for expo/src/winter/ImportMetaRegistry in Jest tests
export class ImportMetaRegistry {
  static registry: Map<string, unknown> = new Map();

  static register(key: string, value: unknown) {
    this.registry.set(key, value);
  }

  static get(key: string) {
    return this.registry.get(key);
  }
}

module.exports = { ImportMetaRegistry };
