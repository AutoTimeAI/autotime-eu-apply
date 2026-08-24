import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  testDir: "./tests/e2e/production",
  testIgnore: [],
  // Production tests always target an explicit external deployment and must
  // never start a local managed server.
  webServer: undefined,
});
