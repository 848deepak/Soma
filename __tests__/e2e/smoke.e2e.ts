describe('Smoke E2E', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('launches the app and can capture a UI frame', async () => {
    await device.takeScreenshot('smoke-launch');
  });
});
