import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  use: {
    baseURL: 'http://127.0.0.1:4173'
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', use: { viewport: { width: 834, height: 1112 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'reduced-motion', use: { viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' } }
  ]
});
