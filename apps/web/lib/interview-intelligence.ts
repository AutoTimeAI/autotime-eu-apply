/**
 * Server-side entry point that calls the NVIDIA-hosted chat completion API
 * to reword interview questions for clarity, or returns them unchanged in
 * "mock" mode. Every response - real or mocked - is passed through
 * validateInterviewAiOutput (./interview-ai-contract) before being
 * returned, so a misbehaving model response can never bypass the
 * question/id allowlist.
 */
import "server-only";
import type { InterviewQuestion } from "./interview-workflow";
import {
  mockInterviewQuestionRewrite,
  validateInterviewAiOutput,
  type InterviewQuestionRewrite,
} from "./interview-ai-contract";
export { validateInterviewAiOutput } from "./interview-ai-contract";
/**
 * Rewrites `input.questions` for clarity via the configured AI mode.
 * `input.mode` defaults to the INTERVIEW_PREP_AI_MODE env var, then
 * "mock". In "mock" mode, returns the questions unchanged
 * (mockInterviewQuestionRewrite) with no network call. In "nvidia" mode,
 * calls the NVIDIA chat completions API (model from NVIDIA_MODEL, default
 * "meta/llama-3.1-70b-instruct") with a system prompt instructing it to
 * only reword supplied questions and never add facts/evidence/scores;
 * extracts the first JSON array found in the response text (tolerating
 * extra prose around it) and validates it via validateInterviewAiOutput.
 * Throws for any other mode, a missing NVIDIA_API_KEY, a non-OK HTTP
 * response, or output that fails validation. `input.fetchImpl` lets tests
 * inject a fetch stub.
 */
export async function rewriteInterviewQuestions(input: {
  questions: InterviewQuestion[];
  mode?: string;
  fetchImpl?: typeof fetch;
}): Promise<InterviewQuestionRewrite[]> {
  const mode = input.mode ?? process.env.INTERVIEW_PREP_AI_MODE ?? "mock";
  if (mode === "mock") return mockInterviewQuestionRewrite(input.questions);
  if (mode !== "nvidia") throw new Error("Unsupported interview AI mode.");
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("Interview AI is unavailable.");
  const response = await (input.fetchImpl ?? fetch)(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.NVIDIA_MODEL ?? "meta/llama-3.1-70b-instruct",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Rewrite only supplied questions for clarity. Return JSON array with exactly id and question. Never add facts, evidence, scores, legal conclusions or predictions.",
          },
          {
            role: "user",
            content: JSON.stringify(
              input.questions.map((item) => ({
                id: item.id,
                question: item.question,
                reason: item.reason,
              })),
            ),
          },
        ],
      }),
    },
  );
  if (!response.ok) throw new Error("Interview AI is unavailable.");
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = body.choices?.[0]?.message?.content ?? "";
  return validateInterviewAiOutput(
    JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? text),
    input.questions,
  );
}
