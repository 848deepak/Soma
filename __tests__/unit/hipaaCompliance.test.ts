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

import { _resetKeyCache } from '@/src/services/encryptionService';
import { verifyHipaaEncryptionCompliance } from '@/src/services/encryptionService/hipaaCompliance';
import * as SecureStore from 'expo-secure-store';

describe('verifyHipaaEncryptionCompliance', () => {
  beforeEach(() => {
    _resetKeyCache();
    mockStore = {};
    jest.clearAllMocks();

    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
      Promise.resolve(mockStore[key] ?? null),
    );
    (SecureStore.setItemAsync as jest.Mock).mockImplementation((key: string, value: string) => {
      mockStore[key] = value;
      return Promise.resolve();
    });
  });

  it('returns a passing report for AES-256-GCM controls', async () => {
    const report = await verifyHipaaEncryptionCompliance();

    expect(report.algorithm).toBe('AES-256-GCM');
    expect(report.keyStorage).toBe('Expo SecureStore');
    expect(report.allPassed).toBe(true);
    expect(report.checks.every((check) => check.passed)).toBe(true);
  });

  it('documents a key rotation cadence and trigger events', async () => {
    const report = await verifyHipaaEncryptionCompliance();

    expect(report.keyRotationPlan.recommendedCadenceDays).toBe(90);
    expect(report.keyRotationPlan.triggerEvents).toContain('suspected_key_exposure');
    expect(report.keyRotationPlan.triggerEvents).toContain('major_security_incident');
  });
});
