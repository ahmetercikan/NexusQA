import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './backend/tests/generated',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: false, // Browser açık şekilde çalışsın
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
