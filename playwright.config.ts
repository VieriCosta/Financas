import { defineConfig, devices } from "@playwright/test";
if (!process.env.TEST_DATABASE_URL)
  throw new Error(
    "Defina TEST_DATABASE_URL para executar os testes de interface em um banco isolado.",
  );
const testEnvironment = {
  ...process.env,
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  NODE_ENV: "test",
  JWT_SECRET: "browser-test-secret-at-least-32-characters",
  PORT: "3358",
  VITE_API_URL: "http://127.0.0.1:3358/api",
};
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  outputDir: ".cache/playwright-results",
  use: {
    baseURL: "http://127.0.0.1:5178",
    trace: "retain-on-failure",
    launchOptions: { channel: process.env.CI ? undefined : "chrome" },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [
    {
      command: "npx tsx e2e/server.ts",
      url: "http://127.0.0.1:3358/health",
      env: testEnvironment,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -w frontend -- --port 5178",
      url: "http://127.0.0.1:5178",
      env: testEnvironment,
      reuseExistingServer: false,
    },
  ],
});
