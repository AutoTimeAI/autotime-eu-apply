# Phase 3B core workflow

## Consolidated routes

- `/dashboard/jobs` owns job capture and filtering.
- `/dashboard/jobs/[jobId]` owns Overview, Analysis, Application and Activity.
- `/dashboard/applications` owns the compact application pipeline.
- `/dashboard/applications/[applicationId]` owns preparation, review, submission recording and follow-up.

Match Score, Inbox, CV Tailor, Application Answers, Documents and Follow-ups redirect to the consolidated destinations. Extension contracts remain unchanged.

## State ownership

| State                                            | Canonical owner                                                   |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| Candidate evidence and Proof Library             | Existing confirmed profile and `evidence_records` contract        |
| Career lanes                                     | Role Pathways lane storage                                        |
| Mobility profile                                 | Governed mobility repository and International module             |
| Job, analysis versions and application workspace | Phase 3B user-scoped workflow facade                              |
| Existing synced application/outcome records      | Existing dashboard sync schema, preserved for additive adaptation |
| Documents, answers, follow-up and outcome        | Selected application workspace                                    |

The facade is versioned and keyed by authenticated user ID. It avoids a destructive rewrite while the existing local/cloud application schema remains in use. No database migration is required or applied.

## Analysis and readiness

Extraction retains the source phrase for consequential fields. Missing facts stay unknown. Requirements are deterministically compared with confirmed evidence. Career-lane alignment is context only. Sponsor-register presence never becomes vacancy sponsorship, and missing salary never becomes salary failure.

AI is not in the final scoring path. Re-analysis appends a result version rather than replacing history.

Ready requires confirmed job facts, confirmed supporting evidence, explicit review of consequential answers and no unsupported claims. Profile percentage is irrelevant. Applied requires a Ready workspace and explicit confirmation; AutoTime records but performs no external submission.

## Privacy and limitations

Workflow content remains inside authenticated user-scoped storage. IDs resolve only within that state and unknown IDs return a safe not-found view. Vacancy/CV text is not sent to analytics. Restricted-platform URLs are metadata only and are never fetched.

The facade does not yet sync Phase 3B records to Supabase. A future reviewed adapter may add durable, server-validated job ownership without removing the extension contract.
