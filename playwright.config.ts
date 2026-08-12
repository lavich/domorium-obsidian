import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  outputDir: "harness/results",
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 900, height: 600 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
