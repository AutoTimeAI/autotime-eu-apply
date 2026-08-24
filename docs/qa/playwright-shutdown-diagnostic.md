# Playwright managed-server shutdown diagnostic

## Symptom

On Windows, the local suite completed all assertions but remained at
`Terminating the WebServer` when executed in the restricted filesystem/process
sandbox. A standalone accessibility run behaved identically.

## Root cause

Playwright 1.60 launches `webServer.command` through `cmd.exe`. During teardown,
its Windows process launcher uses `taskkill /pid <shell-pid> /T /F` and waits for
the shell's `close` event. The restricted sandbox did not allow that child
process-tree operation, leaving the shell, Next CLI, and Next server child alive.

With the same repository SHA, configuration, test, browser, and Next command in
an authorised local process context, Playwright logged both
`Terminating the WebServer` and `Terminated the WebServer`, reported the test as
passed, exited naturally with code 0, and left no scoped child process behind.

This rules out application timers, browser/context/page cleanup, reporters,
tracing, test hooks, database clients, and Next request handlers as the cause.
No forced termination was added to application or test-runner code; Playwright's
documented Windows process-tree cleanup remains the lifecycle owner.

## Regression procedure

Run the standalone accessibility test and full local suite in an environment
where the Playwright process may manage its own Windows child tree. Both commands
must reach `Terminated the WebServer`, exit naturally with code 0, and leave port
3000 unbound. A passing assertion count without a clean command exit is a FAIL.
