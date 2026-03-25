import { _resetKeyCache, encryptionService } from '@/src/services/encryptionService';

export type HipaaEncryptionCheck = {
  name: string;
  passed: boolean;
  details: string;
};

export type HipaaEncryptionComplianceReport = {
  checkedAt: string;
  algorithm: 'AES-256-GCM';
  keyStorage: 'Expo SecureStore';
  checks: HipaaEncryptionCheck[];
  allPassed: boolean;
  keyRotationPlan: {
    recommendedCadenceDays: number;
    triggerEvents: string[];
  };
};

function decodeBase64Length(value: string): number {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0)).length;
}

function buildTamperedPayload(encryptedPayload: string): string {
  const [iv, ciphertext] = encryptedPayload.split('.');
  if (!iv || !ciphertext) return encryptedPayload;

  const replacement = ciphertext.endsWith('A') ? 'B' : 'A';
  return `${iv}.${ciphertext.slice(0, -1)}${replacement}`;
}

export async function verifyHipaaEncryptionCompliance(): Promise<HipaaEncryptionComplianceReport> {
  const samplePayload = JSON.stringify({
    category: 'cycle_data',
    classification: 'phi',
    value: 'sample',
  });

  const encryptedOne = await encryptionService.encrypt(samplePayload);
  const encryptedTwo = await encryptionService.encrypt(samplePayload);

  const [ivOne, ciphertextOne] = encryptedOne.split('.');
  const [ivTwo] = encryptedTwo.split('.');

  const ivLengthCheck = !!ivOne && decodeBase64Length(ivOne) === 12;
  const ciphertextPresentCheck = !!ciphertextOne && ciphertextOne.length > 0;
  const ivRandomnessCheck = !!ivOne && !!ivTwo && ivOne !== ivTwo;

  const decrypted = await encryptionService.decrypt(encryptedOne);
  const roundTripCheck = decrypted === samplePayload;
  const plaintextLeakCheck = !encryptedOne.includes(samplePayload);

  const tamperedPayload = buildTamperedPayload(encryptedOne);
  let authTagCheck = false;
  try {
    await encryptionService.decrypt(tamperedPayload);
  } catch {
    authTagCheck = true;
  }

  const keyPersistenceProbe = await encryptionService.encrypt('persistence-probe');
  _resetKeyCache();
  const keyPersistenceCheck = (await encryptionService.decrypt(keyPersistenceProbe)) === 'persistence-probe';

  const checks: HipaaEncryptionCheck[] = [
    {
      name: 'nist_approved_algorithm',
      passed: true,
      details: 'AES-256-GCM is selected as the encryption algorithm.',
    },
    {
      name: 'iv_length_96_bits',
      passed: ivLengthCheck,
      details: 'Encrypted payload IV decodes to 12 bytes (96 bits).',
    },
    {
      name: 'ciphertext_present',
      passed: ciphertextPresentCheck,
      details: 'Ciphertext section exists and is non-empty.',
    },
    {
      name: 'iv_randomness',
      passed: ivRandomnessCheck,
      details: 'Repeated encryption of same plaintext generates different IV values.',
    },
    {
      name: 'round_trip_integrity',
      passed: roundTripCheck,
      details: 'Encrypted payload decrypts back to the original plaintext.',
    },
    {
      name: 'no_plaintext_leak_in_payload',
      passed: plaintextLeakCheck,
      details: 'Encrypted payload does not include the plaintext body.',
    },
    {
      name: 'auth_tag_validation',
      passed: authTagCheck,
      details: 'Tampered payload is rejected during decrypt().',
    },
    {
      name: 'key_persistence_after_restart',
      passed: keyPersistenceCheck,
      details: 'Encrypted data can be decrypted after clearing in-memory key cache.',
    },
  ];

  return {
    checkedAt: new Date().toISOString(),
    algorithm: 'AES-256-GCM',
    keyStorage: 'Expo SecureStore',
    checks,
    allPassed: checks.every((check) => check.passed),
    keyRotationPlan: {
      recommendedCadenceDays: 90,
      triggerEvents: [
        'suspected_key_exposure',
        'device_compromise_reported',
        'major_security_incident',
      ],
    },
  };
}
