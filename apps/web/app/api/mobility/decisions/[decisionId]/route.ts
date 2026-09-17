import { type NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getRequestUser } from "../../../../../lib/api-auth"
import { createAdminClient } from "../../../../../lib/supabase/admin"
import { toPublicApiError } from "../../../../../lib/public-api-error"

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" }

type Row = Record<string, unknown>
type QueryResult = { data: Row[] | Row | null; error: { message: string } | null }
type UntypedClient = SupabaseClient<Record<string, unknown>>

function rows(result: QueryResult): Row[] {
  return Array.isArray(result.data) ? result.data : []
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ decisionId: string }> },
) {
  try {
    const { user } = await getRequestUser(request)
    if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401, headers: privateHeaders })

    const { decisionId } = await params
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(decisionId)) {
      return NextResponse.json({ data: null, error: "Invalid decision identifier" }, { status: 400, headers: privateHeaders })
    }

    // The service client bypasses RLS, so ownership is part of the first query
    // and no related table is touched until that check succeeds.
    const db = createAdminClient() as unknown as UntypedClient
    const decisionResult = await db.from("mobility_decision_records").select(
      "id,vacancy_snapshot_id,employer_verification_id,rule_bundle_version_id,mobility_state,employer_state,output_permission,reason_codes,canonical_output,canonical_output_sha256,supersedes_decision_id,recorded_at",
    ).eq("id", decisionId).eq("user_id", user.id).maybeSingle()
    if (decisionResult.error) throw decisionResult.error
    if (!decisionResult.data) return NextResponse.json({ data: null, error: "Decision not found" }, { status: 404, headers: privateHeaders })

    const decision = decisionResult.data as Row
    const canonicalOutput = decision.canonical_output as Row | null
    const readinessSnapshotId = typeof canonicalOutput?.readinessSnapshotId === "string" ? canonicalOutput.readinessSnapshotId : null
    const [vacancy, ruleBundle, readinessSnapshot, evidenceLinks, replayInputs, corrections, replays, employer] = await Promise.all([
      db.from("mobility_vacancy_snapshots").select("id,source_url,employing_entity_claim,title,country,content_sha256,captured_at,recorded_at").eq("id", String(decision.vacancy_snapshot_id)).eq("user_id", user.id).maybeSingle(),
      db.from("mobility_rule_bundle_versions").select("id,bundle_id,version,state,evaluation_case_ids,effective_from,effective_to,recorded_at").eq("id", String(decision.rule_bundle_version_id)).maybeSingle(),
      readinessSnapshotId
        ? db.from("mobility_country_readiness_snapshots").select("id,rule_bundle_version_id,expert_signoff_id,state,output_permission,reason_codes,evaluated_at").eq("id", readinessSnapshotId).eq("rule_bundle_version_id", String(decision.rule_bundle_version_id)).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      db.from("mobility_decision_evidence_links").select("claim_version_id,source_span_id,candidate_evidence_version_id,relation").eq("decision_id", decisionId),
      db.from("mobility_decision_replay_inputs").select("candidate_evidence_version_ids,external_assessment_snapshot_ids,input_facts_sha256,recorded_at").eq("decision_id", decisionId).maybeSingle(),
      db.from("mobility_decision_corrections").select("id,successor_decision_id,target_type,target_id,reason,state,submitted_at,resolved_at").eq("original_decision_id", decisionId).eq("user_id", user.id).order("submitted_at", { ascending: false }),
      db.from("mobility_decision_replays").select("id,replay_rule_bundle_version_id,replay_decision_id,mode,state,equivalent,diff,recorded_at,completed_at").eq("original_decision_id", decisionId).eq("user_id", user.id).order("recorded_at", { ascending: false }),
      decision.employer_verification_id
        ? db.from("mobility_employer_verifications").select("id,claimed_name,state,match_method,reason_codes,checked_at,recorded_at").eq("id", String(decision.employer_verification_id)).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
    const firstError = [vacancy, ruleBundle, readinessSnapshot, evidenceLinks, replayInputs, corrections, replays, employer].find((result) => result.error)?.error
    if (firstError) throw firstError

    const links = rows(evidenceLinks as unknown as QueryResult)
    const correctionRows = rows(corrections as unknown as QueryResult)
    const correctionIds = correctionRows.map((correction) => String(correction.id))
    const correctionReviews = correctionIds.length
      ? await db.from("mobility_decision_correction_reviews")
        .select("id,correction_id,decision,reason_codes,resolution_notes,evidence_references,successor_decision_id,reviewed_at")
        .in("correction_id", correctionIds)
        .order("reviewed_at", { ascending: false })
      : { data: [], error: null }
    if (correctionReviews.error) throw correctionReviews.error
    const claimIds = links.map((link) => String(link.claim_version_id))
    const spanIds = links.map((link) => String(link.source_span_id))
    const replayInputRow = replayInputs.data as Row | null
    const replayCandidateIds = Array.isArray(replayInputRow?.candidate_evidence_version_ids)
      ? (replayInputRow.candidate_evidence_version_ids as unknown[]).map(String)
      : []
    const candidateIds = [...new Set([
      ...links.map((link) => link.candidate_evidence_version_id).filter(Boolean).map(String),
      ...replayCandidateIds,
    ])]
    const readinessRow = readinessSnapshot.data as Row | null
    const [claims, spans, candidateEvidence, signoff] = await Promise.all([
      claimIds.length ? db.from("mobility_claim_versions").select("id,claim_id,version,statement,claim_type,confidence,state,effective_from,effective_to,recorded_at").in("id", claimIds) : Promise.resolve({ data: [], error: null }),
      spanIds.length ? db.from("mobility_source_spans").select("id,source_version_id,locator,exact_text,exact_text_sha256,recorded_at").in("id", spanIds) : Promise.resolve({ data: [], error: null }),
      candidateIds.length ? db.from("mobility_candidate_evidence_versions").select("id,evidence_item_id,version,status,source_kind,source_label,value_sha256,confirmed_at,expires_at,recorded_at").in("id", candidateIds) : Promise.resolve({ data: [], error: null }),
      readinessRow?.expert_signoff_id
        ? db.from("mobility_expert_signoffs").select("id,reviewer_role,qualification_basis,scope_reviewed,permitted_output_language,conditions_and_exclusions,decision,effective_from,review_by,signed_at,signature_reference").eq("id", String(readinessRow.expert_signoff_id)).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
    const secondError = [claims, spans, candidateEvidence, signoff].find((result) => result.error)?.error
    if (secondError) throw secondError

    const sourceVersionIds = rows(spans as unknown as QueryResult).map((span) => String(span.source_version_id))
    const sourceVersions = sourceVersionIds.length
      ? await db.from("mobility_source_versions").select("id,source_document_id,version,retrieved_at,published_at,effective_from,effective_to,expires_at,language,http_status,normalized_sha256,snapshot_uri,parser_version,normalizer_version,recorded_at").in("id", sourceVersionIds)
      : { data: [], error: null }
    if (sourceVersions.error) throw sourceVersions.error
    const documentIds = rows(sourceVersions as unknown as QueryResult).map((version) => String(version.source_document_id))
    const sourceDocuments = documentIds.length
      ? await db.from("mobility_source_documents").select("id,canonical_url,publisher,jurisdiction,source_class").in("id", documentIds)
      : { data: [], error: null }
    if (sourceDocuments.error) throw sourceDocuments.error

    return NextResponse.json({
      data: {
        decision,
        vacancy: vacancy.data,
        ruleBundle: ruleBundle.data,
        readinessSnapshot: readinessSnapshot.data,
        employerVerification: employer.data,
        replayInputs: replayInputs.data,
        evidenceLinks: links,
        claims: claims.data ?? [],
        sourceSpans: spans.data ?? [],
        sourceVersions: sourceVersions.data ?? [],
        sourceDocuments: sourceDocuments.data ?? [],
        candidateEvidence: candidateEvidence.data ?? [],
        expertSignoffs: signoff.data ? [signoff.data] : [],
        corrections: correctionRows,
        correctionReviews: correctionReviews.data ?? [],
        replays: replays.data ?? [],
      },
      error: null,
    }, { headers: privateHeaders })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: toPublicApiError(error instanceof Error ? error.message : "Decision lineage could not be loaded", 500) },
      { status: 500, headers: privateHeaders },
    )
  }
}
