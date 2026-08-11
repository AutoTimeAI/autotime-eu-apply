import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { assertAiRouteRateLimit, RateLimitError, runEscoQuestionnaireRoundWithOpenAI } from "../../../../lib/openai-server";
import { assertCanUseAi, FeatureGateError, trackAiCall } from "../../../../lib/feature-gate";

const schema = z.object({ question: z.string().min(5).max(500), answer: z.string().min(20).max(10000) });
const openQuestion = "What kind of work are you strongest at, and what have you actually done recently?";

export async function GET(request: NextRequest) {
  const { user } = await getRequestUser(request); if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 });
  const db = createAdminClient();
  const [answers, profile] = await Promise.all([
    db.from("esco_questionnaire_answers").select("question,answer,sequence,next_question").eq("user_id", user.id).order("sequence"),
    db.from("user_skill_profile").select("esco_skill_id,confidence,source").eq("user_id", user.id).order("confidence", { ascending: false }),
  ]);
  const ids = (profile.data ?? []).map((item) => item.esco_skill_id);
  const labels = ids.length ? await db.from("esco_skills").select("id,preferred_label").in("id", ids) : { data: [], error: null };
  const labelMap = new Map((labels.data ?? []).map((item) => [item.id, item.preferred_label]));
  return NextResponse.json({ data: { answers: answers.data ?? [], profile: (profile.data ?? []).map((item) => ({ ...item, preferred_label: labelMap.get(item.esco_skill_id) ?? item.esco_skill_id })), nextQuestion: answers.data?.at(-1)?.next_question || openQuestion, complete: (answers.data?.length ?? 0) >= 6 }, error: answers.error?.message ?? profile.error?.message ?? labels.error?.message ?? null });
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getRequestUser(request); if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 });
    const body = schema.parse(await request.json()); const db = createAdminClient();
    const [{ data: history, error: historyError }, { data: accumulatedProfile, error: profileError }] = await Promise.all([
      db.from("esco_questionnaire_answers").select("question,answer,sequence").eq("user_id", user.id).order("sequence"),
      db.from("user_skill_profile").select("esco_skill_id,confidence,source").eq("user_id", user.id).order("confidence", { ascending: true }),
    ]); if (historyError) throw historyError; if (profileError) throw profileError;
    const round = (history?.length ?? 0) + 1; if (round > 6) return NextResponse.json({ data: null, error: "The six-question MVP is complete." }, { status: 409 });
    const terms = [...new Set(body.answer.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? [])].slice(0, 8);
    let candidates: Array<{ id: string; preferred_label: string; skill_type: string | null }> = [];
    for (const term of terms) { const { data } = await db.from("esco_skills").select("id,preferred_label,skill_type").eq("language", "en").ilike("preferred_label", `%${term}%`).limit(20); candidates.push(...(data ?? [])); }
    const accumulatedIds = (accumulatedProfile ?? []).map((item) => item.esco_skill_id);
    if (accumulatedIds.length) { const { data } = await db.from("esco_skills").select("id,preferred_label,skill_type").in("id", accumulatedIds); candidates.push(...(data ?? [])); }
    candidates = [...new Map(candidates.map((item) => [item.id, item])).values()].slice(0, 120);
    if (!candidates.length) { const { data } = await db.from("esco_skills").select("id,preferred_label,skill_type").eq("language", "en").limit(120); candidates = data ?? []; }
    await assertAiRouteRateLimit(user.id); await assertCanUseAi(user.id);
    const result = await runEscoQuestionnaireRoundWithOpenAI({ question: body.question, answer: body.answer, answeredSoFar: (history ?? []).map(({ question, answer }) => ({ question, answer })), candidateSkills: candidates.map((item) => ({ id: item.id, preferredLabel: item.preferred_label, skillType: item.skill_type })), currentSkillProfile: (accumulatedProfile ?? []).map((item) => ({ escoSkillId: item.esco_skill_id, confidence: item.confidence, source: item.source })), round });
    const allowed = new Set(candidates.map((item) => item.id)); const skills = result.value.skills.filter((item) => allowed.has(item.escoSkillId));
    const answerInsert = await db.from("esco_questionnaire_answers").insert({ user_id: user.id, question: body.question, answer: body.answer, sequence: round, next_question: round >= 6 ? null : result.value.nextQuestion }); if (answerInsert.error) throw answerInsert.error;
    if (skills.length) { const upsert = await db.from("user_skill_profile").upsert(skills.map((item) => ({ user_id: user.id, esco_skill_id: item.escoSkillId, confidence: item.confidence, source: item.source, updated_at: new Date().toISOString() }))); if (upsert.error) throw upsert.error; }
    await trackAiCall(user.id, { feature: "esco-questionnaire", model: result.model, promptTokens: result.promptTokens, completionTokens: result.completionTokens, costUsd: result.costUsd });
    return NextResponse.json({ data: { round, skills, nextQuestion: round >= 6 ? "" : result.value.nextQuestion, complete: round >= 6 || result.value.complete }, error: null });
  } catch (error) { const status = error instanceof z.ZodError ? 400 : error instanceof FeatureGateError ? 402 : error instanceof RateLimitError ? 429 : 500; return NextResponse.json({ data: null, error: error instanceof Error ? error.message : "Questionnaire failed" }, { status }); }
}

export async function PATCH(request: NextRequest) {
  try { const { user } = await getRequestUser(request); if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 }); const body = z.object({ escoSkillId: z.string().min(1), confirmed: z.boolean() }).parse(await request.json()); const { data, error } = await createAdminClient().from("user_skill_profile").update({ source: body.confirmed ? "confirmed" : "inferred", updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("esco_skill_id", body.escoSkillId).select("esco_skill_id,confidence,source").single(); if (error) throw error; return NextResponse.json({ data, error: null }); } catch (error) { return NextResponse.json({ data: null, error: error instanceof Error ? error.message : "Confirmation failed" }, { status: error instanceof z.ZodError ? 400 : 500 }); }
}
