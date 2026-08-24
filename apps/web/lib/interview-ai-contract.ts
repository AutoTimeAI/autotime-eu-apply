/**
 * Defines and enforces the strict output contract an AI-rewritten interview
 * question must satisfy. Interview questions are one of the few places the
 * product lets an AI model touch user-facing content, so this module
 * exists to guarantee the model can only reword an already-approved
 * question - never introduce a new id, add extra fields, or return
 * anything that isn't in the caller-supplied allowlist.
 */
import type { InterviewQuestion } from "./interview-workflow";

export type InterviewQuestionRewrite = { id: string; question: string };
const clean = (value: unknown) =>
  typeof value === "string" ? value.trim().slice(0, 600) : "";

/**
 * Validates that `value` is an array of `{ id, question }` objects whose
 * `id`s are all present in `allowed` (with no extra properties per item),
 * trimming/truncating each question to 600 characters. Throws "Malformed
 * interview AI output." for any structural violation - wrong shape, an
 * unknown id, an extra key, or an empty question after cleaning.
 */
export function validateInterviewAiOutput(
  value: unknown,
  allowed: InterviewQuestion[],
): InterviewQuestionRewrite[] {
  if (!Array.isArray(value)) throw new Error("Malformed interview AI output.");
  const ids = new Set(allowed.map((item) => item.id));
  return value.map((item) => {
    if (!item || typeof item !== "object")
      throw new Error("Malformed interview AI output.");
    const record = item as Record<string, unknown>;
    if (
      !ids.has(String(record.id)) ||
      Object.keys(record).some((key) => !["id", "question"].includes(key))
    )
      throw new Error("Malformed interview AI output.");
    const question = clean(record.question);
    if (!question) throw new Error("Malformed interview AI output.");
    return { id: String(record.id), question };
  });
}

/** No-op "rewrite" used in mock/test mode: returns each question's id and original text unchanged, in the same contract shape a real AI rewrite would produce. */
export function mockInterviewQuestionRewrite(
  questions: InterviewQuestion[],
): InterviewQuestionRewrite[] {
  return questions.map((item) => ({ id: item.id, question: item.question }));
}
