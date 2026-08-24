// Public entry point of the `shared` package (imported as `from "shared"` by
// both apps/web and apps/extension). Re-exports every domain schema, type,
// and pure-function module that the two apps need to agree on: application
// data shapes (schemas/types), the local fit-scoring engine, country/EU
// mobility rules, ATS/platform detection, and CV<->profile bridging helpers.
// Keeping this as a single barrel means both apps share one source of truth
// for candidate/job/application data instead of duplicating logic client-side.
export * from "./schemas.ts"
export * from "./fit-model.ts"
export * from "./country-rules.ts"
export * from "./profile-bridge.ts"
export * from "./international/index.ts"
export * from "./role-pathways.ts"
export * from "./ats-detector.ts"
export * from "./platform-coverage.ts"
export type * from "./types.ts"
