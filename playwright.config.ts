import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 8000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: process.env.VPG_CHROMIUM_PATH
          ? {
              executablePath: process.env.VPG_CHROMIUM_PATH,
              args: ['--no-sandbox', '--disable-dev-shm-usage'],
              env: process.env,
            }
          : {},
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: '**/clipboard-native.spec.ts',
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: '**/clipboard-native.spec.ts',
    },
  ],
  webServer: [
    {
      command: 'node --experimental-strip-types tests/update-server.ts',
      url: 'http://127.0.0.1:4191/__test/status',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run preview -- --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173/',
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        'npm run preview -- --outDir dist-pages --base /video-prompt-generator/ --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174/video-prompt-generator/',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
