import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// RTL's own automatic cleanup only self-registers when it detects
// `afterEach` on globalThis, which requires `test.globals: true` in the
// Vitest config. This project doesn't enable that (tests import afterEach
// explicitly instead), so without this, each test's rendered DOM leaks
// into the next test in the same file.
afterEach(() => {
  cleanup();
});
