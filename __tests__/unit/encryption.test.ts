/**
 * __tests__/unit/encryption.test.ts
 *
 * Unit tests for the real AES-256-GCM encryptionService.
 * expo-secure-store is mocked to an in-memory store that is reset
 * between tests.  crypto.subtle runs through Node.js 21+'s built-in
 * implementation so no additional tooling is required.
 */

// ─── Controlled SecureStore mock ────────────────────────────────────────────
// We define our own store object so we can reset it via `mockStore = {}`
// in beforeEach without touching the module cache.

let mockStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockStore[key];
    return Promise.resolve();
  }),
}));

// ─── Imports (after jest.mock) ────────────────────────────────────────────────

import { encryptionService, _resetKeyCache } from '@/src/services/encryptionService';
import * as SecureStore from 'expo-secure-store';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('encryptionService – AES-256-GCM', () => {
  beforeEach(() => {
    // Reset both the in-memory key cache and the SecureStore state
    _resetKeyCache();
    mockStore = {};
    jest.clearAllMocks();
    // Re-apply mock implementations after clearAllMocks (clearAllMocks clears call records)
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
      Promise.resolve(mockStore[key] ?? null),
    );
    (SecureStore.setItemAsync as jest.Mock).mockImplementation((key: string, value: string) => {
      mockStore[key] = value;
      return Promise.resolve();
    });
    (SecureStore.deleteItemAsync as jest.Mock).mockImplementation((key: string) => {
      delete mockStore[key];
      return Promise.resolve();
    });
  });

  // ── Output format ────────────────────────────────────────────────────────────

  describe('encrypted output format', () => {
    it('produces a string with exactly one "." separator', async () => {
      const result = await encryptionService.encrypt('hello');
      const parts = result.split('.');
      expect(parts).toHaveLength(2);
    });

    it('produces a non-empty IV part (base64 string before ".")', async () => {
      const result = await encryptionService.encrypt('hello');
      const [iv] = result.split('.');
      expect(iv.length).toBeGreaterThan(0);
    });

    it('produces a non-empty ciphertext part (base64 string after ".")', async () => {
      const result = await encryptionService.encrypt('hello');
      const [, ciphertext] = result.split('.');
      expect(ciphertext.length).toBeGreaterThan(0);
    });

    it('does not return the plaintext in the output', async () => {
      const plaintext = 'sensitive health data';
      const result = await encryptionService.encrypt(plaintext);
      expect(result).not.toContain(plaintext);
    });
  });

  // ── Round-trip ───────────────────────────────────────────────────────────────

  describe('encrypt → decrypt round-trip', () => {
    it('decrypts back to the original plaintext', async () => {
      const original = 'hello world';
      const encrypted = await encryptionService.encrypt(original);
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('handles empty string payloads', async () => {
      const encrypted = await encryptionService.encrypt('');
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('handles JSON payloads (typical use case for sync_queue)', async () => {
      const original = JSON.stringify({ id: 'abc', mood: 'happy', tags: ['Cramps', 'Bloating'] });
      const encrypted = await encryptionService.encrypt(original);
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(original));
    });

    it('handles Unicode and multi-byte characters', async () => {
      const original = '健康データ 🌸 Données de santé';
      const encrypted = await encryptionService.encrypt(original);
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('handles long payloads (10 KB)', async () => {
      const original = 'x'.repeat(10 * 1024);
      const encrypted = await encryptionService.encrypt(original);
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });
  });

  // ── IV randomness ────────────────────────────────────────────────────────────

  describe('IV randomness', () => {
    it('produces a different ciphertext each time the same plaintext is encrypted', async () => {
      const plaintext = 'same plaintext';
      const enc1 = await encryptionService.encrypt(plaintext);
      const enc2 = await encryptionService.encrypt(plaintext);
      expect(enc1).not.toBe(enc2);
    });

    it('can still decrypt both ciphertexts of the same plaintext', async () => {
      const plaintext = 'same plaintext';
      const enc1 = await encryptionService.encrypt(plaintext);
      const enc2 = await encryptionService.encrypt(plaintext);
      expect(await encryptionService.decrypt(enc1)).toBe(plaintext);
      expect(await encryptionService.decrypt(enc2)).toBe(plaintext);
    });
  });

  // ── Key persistence via SecureStore ──────────────────────────────────────────

  describe('key persistence', () => {
    it('calls SecureStore.setItemAsync once when generating a new key', async () => {
      await encryptionService.encrypt('test');
      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    });

    it('does not call setItemAsync again on subsequent encryptions (key is cached)', async () => {
      await encryptionService.encrypt('first');
      await encryptionService.encrypt('second');
      // setItemAsync should only be called once (during initial key generation)
      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    });

    it('calls SecureStore.getItemAsync to check for existing key on first use', async () => {
      await encryptionService.encrypt('test');
      expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);
    });

    it('does not call getItemAsync again once key is in memory cache', async () => {
      await encryptionService.encrypt('first');
      await encryptionService.encrypt('second');
      // getItemAsync should only be called once (key loaded into cache)
      expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);
    });

    it('loads existing key from SecureStore and does not regenerate', async () => {
      // Simulate first run: generate and store key
      await encryptionService.encrypt('first run');
      const callsAfterFirstRun = (SecureStore.setItemAsync as jest.Mock).mock.calls.length;
      expect(callsAfterFirstRun).toBe(1);

      // Reset memory cache but keep the stored key
      _resetKeyCache();

      // Second run: key should be loaded from SecureStore, not regenerated
      await encryptionService.encrypt('second run');
      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1); // still 1 – not called again
    });

    it('can decrypt with key reloaded from SecureStore', async () => {
      const original = 'persisted secret';
      const encrypted = await encryptionService.encrypt(original);

      // Simulate app restart: clear the in-memory cache
      _resetKeyCache();

      // Key should be reloaded from SecureStore
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });
  });

  // ── Invalid payload handling ──────────────────────────────────────────────────

  describe('invalid payload handling', () => {
    it('throws when payload has no "." separator', async () => {
      await expect(encryptionService.decrypt('nodothere')).rejects.toThrow(
        'Invalid encrypted payload: missing IV separator',
      );
    });

    it('throws when IV part is empty (payload starts with ".")', async () => {
      await expect(encryptionService.decrypt('.someciphertext')).rejects.toThrow(
        'Invalid encrypted payload: IV or ciphertext is empty',
      );
    });

    it('throws when ciphertext part is empty (payload ends with ".")', async () => {
      await expect(encryptionService.decrypt('someiv.')).rejects.toThrow(
        'Invalid encrypted payload: IV or ciphertext is empty',
      );
    });

    it('throws when ciphertext is corrupted (GCM auth tag mismatch)', async () => {
      const encrypted = await encryptionService.encrypt('original data');
      // Corrupt the ciphertext portion
      const [iv] = encrypted.split('.');
      const corruptedPayload = `${iv}.YWJjZGVmZ2hpamtsbW5vcA==`; // valid base64 but wrong bytes
      await expect(encryptionService.decrypt(corruptedPayload)).rejects.toThrow();
    });
  });
});
