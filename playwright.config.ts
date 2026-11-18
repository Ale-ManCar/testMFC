import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_ORIGIN ?? "http://localhost:3100";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 150000,
  use: { ...devices["Desktop Chrome"], baseURL, trace: "retain-on-failure", acceptDownloads: true },
  webServer: process.env.E2E_EXTERNAL === "1" ? undefined : {
    command: "npm run dev -- --hostname 127.0.0.1 --port " + new URL(baseURL).port,
    url: baseURL,
    env: { APP_ORIGIN: baseURL },
    reuseExistingServer: false,
    timeout: 90000,
  },
});
