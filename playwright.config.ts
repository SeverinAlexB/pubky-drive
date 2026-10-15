import { defineConfig } from '@playwright/test'

// End-to-end tests run against a local Pubky testnet (`pubky-testnet`, see README.md), using
// disposable identities from the development sign-up shortcut. Start the testnet with
// e2e/homeserver-rate-limited.toml to test against the production homeserver's rate limits.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5180',
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'app', testIgnore: /rate-limits\.spec\.ts/ },
    // Every browser shares one IP, and so one rate-limit budget: these tests run alone, afterwards.
    { name: 'rate-limits', testMatch: /rate-limits\.spec\.ts/, dependencies: ['app'] },
  ],
  webServer: {
    command: 'npx vite --port 5180 --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: true,
  },
})
