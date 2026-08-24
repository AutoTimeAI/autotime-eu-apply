/**
 * Re-exports the ATS (applicant tracking system) detection utilities from
 * the shared package under this app's own lib path, so web-app code can
 * import ATS detection alongside its other lib/ modules without reaching
 * into the shared package directly.
 */
export { API_COVERED_ATS, detectATS, isApiCoveredJobUrl } from "shared";
