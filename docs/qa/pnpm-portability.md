# pnpm portability remediation

## Root cause

The release lockfile contained a `pnpmfileChecksum` for `.pnpmfile.cjs`.
Windows generated and accepted that checksum, but Vercel's Linux install
calculated a different effective hook configuration and rejected the frozen
install with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. This is the cross-platform
pnpm hook-checksum failure mode tracked upstream in pnpm issue 7951.

The mismatch was not caused by pnpm, Node, or lockfile-version drift: the
candidate pins pnpm 10.33.0, requires Node 24, and uses lockfile version 9. The
tracked hook and lockfile also use LF line endings, and the recorded checksum
matched the local hook bytes exactly. The evidence therefore excludes stale
local content and CRLF conversion as the cause; the portable correction is to
remove the unnecessary imperative hook from the lockfile contract.

## Correction

The imperative hook was redundant. Its only behavior was to prevent the
optional `less` peer from being installed. The repository already expresses
that policy declaratively through `ignoredOptionalDependencies` in
`pnpm-workspace.yaml`. Removing the hook removes the platform/bundler-sensitive
checksum while preserving the dependency policy.

The regenerated lockfile must not contain `pnpmfileChecksum`, `less`,
`image-size`, or `extract-zip`. Windows and Linux verification must use pnpm
10.33.0 with `pnpm install --frozen-lockfile`; bypass flags are not accepted as
verification evidence.
