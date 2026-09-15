const failureStatuses = new Set([
  "baseline_capture_failed",
  "configuration_host_not_allowlisted",
  "configuration_invalid_jurisdiction",
  "source_monitor_failed",
])

export function isSourceMonitorFailure(status: string): boolean {
  return failureStatuses.has(status)
}
