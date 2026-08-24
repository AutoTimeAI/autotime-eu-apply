# Repository scripts

Scripts provide repeatable local setup, validation, migration safety checks,
release gates, and production smoke checks. Run the package scripts declared in
the root `package.json` where available so pinned tooling and platform-specific
shims are applied consistently.

Validation output must redact secrets and distinguish automated success from
manual beta evidence that is still pending. Local migration scripts use
disposable databases or containers and must not target a real Supabase project.
