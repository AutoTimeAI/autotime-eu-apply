import type { ApplicationRecord, EvidenceRecord, InterviewPrepPack, OutcomeRecord } from "shared"
import { normalizeApplicationUrlKey } from "./url-key.ts"

/**
 * Splits an incoming batch of applications into ones the user already
 * deleted elsewhere (tracked as a tombstone by url_key, so a stale client
 * copy doesn't resurrect them) and the ones that should still be written.
 */
export function partitionApplicationsByTombstone(
  applications: ApplicationRecord[],
  deletedUrlKeys: Set<string>,
): {
  deletedApplicationIds: string[]
  activeApplications: ApplicationRecord[]
} {
  const isDeleted = (application: ApplicationRecord) =>
    deletedUrlKeys.has(normalizeApplicationUrlKey(application.url || application.id))

  return {
    deletedApplicationIds: applications
      .filter(isDeleted)
      .map((application) => application.id),
    activeApplications: applications.filter(
      (application) => !isDeleted(application),
    ),
  }
}

/**
 * Maps a client-generated application id to the server's existing row id
 * for the same url_key, so a second device syncing the same job upserts
 * the one server row instead of creating a duplicate.
 */
export function buildApplicationIdMap(
  activeApplications: ApplicationRecord[],
  existingRows: Array<{ id: string; url_key: string }>,
): Map<string, string> {
  const existingByUrlKey = new Map(
    existingRows.map((row) => [row.url_key, row.id]),
  )
  const applicationIdMap = new Map<string, string>()

  for (const application of activeApplications) {
    const existingId = existingByUrlKey.get(
      normalizeApplicationUrlKey(application.url || application.id),
    )

    if (existingId) {
      applicationIdMap.set(application.id, existingId)
    }
  }

  return applicationIdMap
}

/**
 * Evidence, outcome and interview-prep records are only meaningful attached
 * to an application that is actually being kept this sync - a record whose
 * application was just tombstoned should not be written on its own.
 */
export function filterActiveChildRecords({
  activeApplicationIds,
  evidenceRecords,
  outcomeRecords,
  interviewPrepPacks,
}: {
  activeApplicationIds: Set<string>
  evidenceRecords: EvidenceRecord[]
  outcomeRecords: OutcomeRecord[]
  interviewPrepPacks: InterviewPrepPack[]
}): {
  activeEvidenceRecords: EvidenceRecord[]
  activeOutcomeRecords: OutcomeRecord[]
  activeInterviewPrepPacks: InterviewPrepPack[]
} {
  return {
    activeEvidenceRecords: evidenceRecords.filter(
      (record) =>
        !record.applicationId || activeApplicationIds.has(record.applicationId),
    ),
    activeOutcomeRecords: outcomeRecords.filter((record) =>
      activeApplicationIds.has(record.applicationId),
    ),
    activeInterviewPrepPacks: interviewPrepPacks.filter((pack) =>
      activeApplicationIds.has(pack.applicationId),
    ),
  }
}

/**
 * A delete request identifies its target by url or by id; either way the
 * lookup query can match more than one legacy row for the same url_key, so
 * this resolves the full set of row ids to remove and the canonical
 * url_key to tombstone (falling back to a normalized form of whatever the
 * request identified when no matching row exists, e.g. the client is
 * ahead of the server).
 */
export function resolveDeleteTarget({
  body,
  existingApplications,
}: {
  body: { applicationId?: string; url?: string }
  existingApplications: Array<{ id: string; url_key: string }> | null
}): { targetIds: string[]; urlKey: string } {
  const targetApplications = existingApplications ?? []

  return {
    targetIds: targetApplications.map((application) => application.id),
    urlKey:
      targetApplications[0]?.url_key ??
      normalizeApplicationUrlKey(body.url ?? body.applicationId ?? ""),
  }
}
