export const bootstrapRPC = jest.fn().mockResolvedValue({
  profile: null,
  currentCycle: null,
  todayLog: null,
});

export const primeBootstrapCache = jest.fn();