# Web components

These React components implement the public, authentication, and signed-in
product experiences. Page routes resolve server-owned identity and data; client
components own interactive state and call authenticated API boundaries.

Shared primitives live in `product-ui.tsx`. Feature folders contain focused
subcomponents for CVs, international mobility, outreach, admin operations, and
job/application workflows. Components should preserve explicit evidence states,
accessible labels, user confirmation for consequential actions, and user-scoped
browser storage.
