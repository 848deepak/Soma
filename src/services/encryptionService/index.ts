/**
 * src/services/encryptionService/index.ts
 *
 * AES-256-GCM encryption using the Web Crypto API (crypto.subtle).
 *
 * Available in:
 *   - React Native 0.72+ (Hermes v0.12+) – global `crypto` is set up by Hermes
 *   - Node.js 21+  – `globalThis.crypto` is the built-in implementation
 *   - All modern browsers
 *
 * Key management:
 *   A single 256-bit AES-GCM key is generated on first use, exported as raw
 *   bytes, base64-encoded, and persisted to Expo SecureStore under
 *   KEY_STORAGE_KEY.  On every subsequent call the key is imported back from
 *   SecureStore and cached in memory.
 *
 * Encrypted payload format:
 *   "<base64-iv>.<base64-ciphertext+tag>"
 *   The IV is 96 bits (12 bytes) as recommended for AES-GCM.
 *   The GCM authentication tag (16 bytes) is appended to the ciphertext by the
 *   Web Crypto API and is verified transparently by decrypt().
 */
import * as SecureStore from 'expo-secure-store';

// ─── Constants ────────────────────────────────────────────────────────────────

const KEY_STORAGE_KEY = 'soma.aes.key.v1';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH_BITS = 256;
const IV_LENGTH_BYTES = 12; // 96-bit IV – GCM recommendation

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── Key management ───────────────────────────────────────────────────────────

/** In-memory cache so we import the CryptoKey only once per process lifetime. */
let keyCache: CryptoKey | null = null;

async function getOrCreateKey(): Promise<CryptoKey> {
  if (keyCache) return keyCache;

  const stored = await SecureStore.getItemAsync(KEY_STORAGE_KEY);

  if (stored) {
    const keyBytes = base64ToUint8Array(stored);
    keyCache = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: ALGORITHM, length: KEY_LENGTH_BITS },
      false,
      ['encrypt', 'decrypt'],
    );
    return keyCache;
  }

  // First launch: generate, export, persist, cache
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH_BITS },
    true, // extractable so we can export it to SecureStore
    ['encrypt', 'decrypt'],
  );

  const exported = await crypto.subtle.exportKey('raw', key);
  const keyBase64 = uint8ArrayToBase64(new Uint8Array(exported));
  await SecureStore.setItemAsync(KEY_STORAGE_KEY, keyBase64);

  // Re-import as non-extractable for subsequent in-memory use
  keyCache = await crypto.subtle.importKey(
    'raw',
    exported,
    { name: ALGORITHM, length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt'],
  );
  return keyCache;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export type EncryptionService = {
  encrypt: (payload: string) => Promise<string>;
  decrypt: (payload: string) => Promise<string>;
};

export const encryptionService: EncryptionService = {
  /**
   * Encrypts a UTF-8 string with AES-256-GCM.
   * Returns a string of the form "<base64-iv>.<base64-ciphertext+tag>".
   */
  encrypt: async (payload: string): Promise<string> => {
    const key = await getOrCreateKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
    const encodedPayload = new TextEncoder().encode(payload);

    const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encodedPayload);

    return `${uint8ArrayToBase64(iv)}.${uint8ArrayToBase64(new Uint8Array(ciphertext))}`;
  },

  /**
   * Decrypts an AES-256-GCM ciphertext produced by encrypt().
   * Throws if the payload is malformed or the authentication tag is invalid.
   */
  decrypt: async (payload: string): Promise<string> => {
    const dotIndex = payload.indexOf('.');
    if (dotIndex === -1) {
      throw new Error('Invalid encrypted payload: missing IV separator');
    }

    const ivBase64 = payload.slice(0, dotIndex);
    const ciphertextBase64 = payload.slice(dotIndex + 1);

    if (!ivBase64 || !ciphertextBase64) {
      throw new Error('Invalid encrypted payload: IV or ciphertext is empty');
    }

    const iv = base64ToUint8Array(ivBase64);
    const ciphertext = base64ToUint8Array(ciphertextBase64);
    const key = await getOrCreateKey();

    const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  },
};

/**
 * Resets the in-memory key cache.
 * Exported for testing purposes only – do not call from application code.
 */
export function _resetKeyCache(): void {
  keyCache = null;
}
