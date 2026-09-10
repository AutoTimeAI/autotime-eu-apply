import type { NextRequest } from "next/server"
import type { ApplicationRecord, EvidenceRecord, InterviewPrepPack, OutcomeRecord } from "shared"
import type { Database } from "../../lib/supabase/types.ts"

export type SourceSurface =
  Database["public"]["Tables"]["sync_events"]["Insert"]["source_surface"]

export type SyncEventPayload = {
  applications: ApplicationRecord[]
  evidenceRecords?: EvidenceRecord[]
  outcomeRecords?: OutcomeRecord[]
  interviewPrepPacks?: InterviewPrepPack[]
}

export function getSourceSurface(request: NextRequest): SourceSurface {
  return request.headers.get("x-autotime-source") === "extension"
    ? "extension"
    : "web"
}

export function mapSyncEvents({
  applicationIdMap,
  payload,
  sourceSurface,
  userId,
  includeReusableAnswers = true,
}: {
  applicationIdMap?: Map<string, string>
  payload: SyncEventPayload
  sourceSurface: SourceSurface
  userId: string
  includeReusableAnswers?: boolean
}): Database["public"]["Tables"]["sync_events"]["Insert"][] {
  const events: Database["public"]["Tables"]["sync_events"]["Insert"][] =
    includeReusableAnswers
      ? [
          {
            action: "updated",
            entity_id: userId,
            entity_type: "reusable_answers",
            message: "Reusable answers synced to dashboard.",
            source_surface: sourceSurface,
            user_id: userId,
          },
        ]
      : []

  for (const application of payload.applications) {
    events.push({
      action: "updated",
      entity_id: applicationIdMap?.get(application.id) ?? application.id,
      entity_type: "application",
      message: "Application synced to dashboard.",
      source_surface: sourceSurface,
      user_id: userId,
    })
  }

  for (const record of payload.evidenceRecords ?? []) {
    events.push({
      action: "updated",
      entity_id: record.id,
      entity_type: "evidence_record",
      message: "Evidence record synced to dashboard.",
      source_surface: sourceSurface,
      user_id: userId,
    })
  }

  for (const record of payload.outcomeRecords ?? []) {
    events.push({
      action: "updated",
      entity_id: record.id,
      entity_type: "outcome_record",
      message: "Outcome record synced to dashboard.",
      source_surface: sourceSurface,
      user_id: userId,
    })
  }

  for (const pack of payload.interviewPrepPacks ?? []) {
    events.push({
      action: "updated",
      entity_id: pack.id,
      entity_type: "interview_prep_pack",
      message: "Interview prep pack synced to dashboard.",
      source_surface: sourceSurface,
      user_id: userId,
    })
  }

  return events
}
