# Test execution report

## Provisional remediation results

These results were produced before the candidate was frozen and must be repeated under `test-evidence/<frozen-sha>/` before they qualify as final release evidence.

| Gate | Result | Notes |
|---|---|---|
| Dependency audit | PASS (provisional) | 0 Critical, High, Moderate, Low or Info; 1,265 dependencies |
| Lint | PASS (provisional) | All three workspace projects |
| Typecheck | PASS (provisional) | All three workspace projects |
| Unit/security/static suite | PASS (provisional) | Includes session, isolation contracts, AI safety, migration safety, privacy redaction and SSRF |
| Web build | PASS (provisional) | 73 routes/static pages generated |
| Extension build | PASS (provisional) | Chrome MV3 build completed |
| Core E2E | PASS (provisional) | 4/4 and clean exit |
| Accessibility smoke | PASS (provisional) | 1/1 and clean exit |
| Visual regression | PASS (provisional) | 12/12; exactly three founder-approved baselines replaced |
| Affected career-path retest | PASS (provisional) | 7/7 after offline test-principal rate-limit fix |
| Production E2E | BLOCKED | Requires explicit target/credentials and production-safe authorisation |
| RLS/admin/AI/payment database scenarios | BLOCKED | No authorised local/test database daemon |

An exploratory broad run included production-only tests by mistake and ended 97 PASS, 6 FAIL, 24 skipped. Four local failures shared the fixed offline rate-limit cause and pass on retest; two production failures were certificate/prerequisite failures. The default and production Playwright suites are now explicitly separated. This exploratory run is not claimed as a release PASS.
