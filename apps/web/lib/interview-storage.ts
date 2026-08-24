// Persists InterviewWorkflowState (see interview-workflow.ts) to the
// browser's localStorage, keyed per user so one browser profile can't leak
// or mix another user's interview records. Every read is defensively
// validated (schema version, ownership, shape) and falls back to an empty
// state rather than throwing, so a corrupted or foreign-user localStorage
// value can't crash the app.
import type {
  InterviewRecord,
  InterviewWorkflowState,
} from "./interview-workflow";
const baseKey = "autotime-phase-3c-interviews-v1";

/** The empty InterviewWorkflowState used whenever no valid stored state exists for the user. */
export const emptyInterviewWorkflowState: InterviewWorkflowState = {
  interviews: [],
  schemaVersion: 1,
};
const keyFor = (userId: string) => `${baseKey}:${userId}`;
/** True if `item` is schema-version "1", owned by `userId`, and has the minimum required identifying fields. */
const valid = (item: InterviewRecord, userId: string) =>
  item?.schemaVersion === "1" &&
  item.userId === userId &&
  Boolean(item.id && item.applicationId && item.jobId) &&
  Array.isArray(item.questions);
/** Backfills fields added after schema version "1" was first written (preparationVersion, preparationHistory, finalReviewCompleted, per-question origin/version) so older stored records don't break newer code. */
const normalize = (item: InterviewRecord): InterviewRecord => ({
  ...item,
  preparationVersion: item.preparationVersion ?? 1,
  preparationHistory: item.preparationHistory ?? [],
  finalReviewCompleted: item.finalReviewCompleted ?? false,
  questions: item.questions.map((question) => ({
    ...question,
    origin: question.origin ?? "deterministic",
    version: question.version ?? 1,
  })),
});
/**
 * Parses and validates a raw localStorage string into InterviewWorkflowState
 * for `userId`. Returns emptyInterviewWorkflowState if `raw` is null,
 * unparseable, wrong schema version, or contains any interview not owned by
 * `userId` — never throws.
 */
export function parseInterviewWorkflow(
  raw: string | null,
  userId: string,
): InterviewWorkflowState {
  if (!userId.trim()) return emptyInterviewWorkflowState;
  try {
    const value = JSON.parse(raw ?? "null") as InterviewWorkflowState | null;
    return value?.schemaVersion === 1 &&
      Array.isArray(value.interviews) &&
      value.interviews.every((item) => valid(item, userId))
      ? { ...value, interviews: value.interviews.map(normalize) }
      : emptyInterviewWorkflowState;
  } catch {
    return emptyInterviewWorkflowState;
  }
}
/** Reads and validates `userId`'s interview workflow state from localStorage; returns the empty state outside the browser or without a userId. */
export function loadInterviewWorkflow(userId: string): InterviewWorkflowState {
  if (typeof window === "undefined" || !userId.trim())
    return emptyInterviewWorkflowState;
  return parseInterviewWorkflow(
    window.localStorage.getItem(keyFor(userId)),
    userId,
  );
}
/**
 * Validates and writes `state` to `userId`'s localStorage slot, then
 * dispatches an "autotime-interview-workflow-changed" CustomEvent so other
 * parts of the app (e.g. a sync hook) can react. Throws if `userId` is blank
 * or `state` fails validation (wrong schema version, or any interview not
 * owned by `userId`) rather than silently persisting bad data.
 */
export function saveInterviewWorkflow(
  userId: string,
  state: InterviewWorkflowState,
) {
  if (!userId.trim()) throw new Error("Authenticated user ID is required.");
  if (
    state.schemaVersion !== 1 ||
    !state.interviews.every((item) => valid(item, userId))
  )
    throw new Error("Interview state is invalid or belongs to another user.");
  window.localStorage.setItem(keyFor(userId), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("autotime-interview-workflow-changed"));
}
/** Finds the interview with `id` in `state` and returns it only if it's owned by `userId`, otherwise undefined. */
export function findOwnedInterview(
  state: InterviewWorkflowState,
  userId: string,
  id: string,
) {
  const item = state.interviews.find((value) => value.id === id);
  return item?.userId === userId ? item : undefined;
}
