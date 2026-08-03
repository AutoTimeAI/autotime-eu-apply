import type {
  InterviewRecord,
  InterviewWorkflowState,
} from "./interview-workflow";
const baseKey = "autotime-phase-3c-interviews-v1";
export const emptyInterviewWorkflowState: InterviewWorkflowState = {
  interviews: [],
  schemaVersion: 1,
};
const keyFor = (userId: string) => `${baseKey}:${userId}`;
const valid = (item: InterviewRecord, userId: string) =>
  item?.schemaVersion === "1" &&
  item.userId === userId &&
  Boolean(item.id && item.applicationId && item.jobId) &&
  Array.isArray(item.questions);
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
export function loadInterviewWorkflow(userId: string): InterviewWorkflowState {
  if (typeof window === "undefined" || !userId.trim())
    return emptyInterviewWorkflowState;
  return parseInterviewWorkflow(
    window.localStorage.getItem(keyFor(userId)),
    userId,
  );
}
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
export function findOwnedInterview(
  state: InterviewWorkflowState,
  userId: string,
  id: string,
) {
  const item = state.interviews.find((value) => value.id === id);
  return item?.userId === userId ? item : undefined;
}
