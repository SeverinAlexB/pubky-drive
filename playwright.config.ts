import { defineConfig } from '@playwright/test'

// End-to-end tests run against a local Pubky testnet (`pubky-testnet`, see README.md), using
// disposable identities from the development sign-up shortcut.
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
  webServer: {
    command: 'npx vite --port 5180 --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: true,
  },
})
