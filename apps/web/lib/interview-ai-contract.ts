import type { InterviewQuestion } from "./interview-workflow";

export type InterviewQuestionRewrite = { id: string; question: string };
const clean = (value: unknown) =>
  typeof value === "string" ? value.trim().slice(0, 600) : "";

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

export function mockInterviewQuestionRewrite(
  questions: InterviewQuestion[],
): InterviewQuestionRewrite[] {
  return questions.map((item) => ({ id: item.id, question: item.question }));
}
