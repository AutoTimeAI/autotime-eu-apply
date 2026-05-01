# Technical Debt

## Extension

- Continue splitting `apps/extension/sidepanel/main.tsx` before the next large
  side-panel feature. Shared constants, small helpers, side-panel response
  types, navigation, saved-data view sections, the applications list, and edit
  forms have been extracted; form state, persistence calls, tracker import
  logic, and active-section routing still live in the main component.
- Keep background code under `apps/extension/entrypoints/background/index.ts`.
  WXT discovers that entrypoint for the generated MV3 background script.

## Shared Package

- `packages/shared` is reserved for v2, when the web app/backend and extension
  need common schemas or API contracts.
