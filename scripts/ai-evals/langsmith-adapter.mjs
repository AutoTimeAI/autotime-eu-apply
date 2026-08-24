// Optional LangSmith adapter. Only activates when LANGSMITH_API_KEY is
// set - the main suite (scripts/ai-quality-evaluation.test.mjs) runs fully
// mocked and passes with or without this adapter, and never makes a paid
// API call on its own account.
//
// When active, logs each eval case's pass/fail result as a LangSmith run
// via a plain fetch call (no LangSmith SDK dependency added to keep the
// main suite's dependency footprint unchanged when this is inactive).

export function isLangSmithActive() {
  return Boolean(process.env.LANGSMITH_API_KEY?.trim());
}

export async function reportEvalCase({ id, name, passed, durationMs }) {
  if (!isLangSmithActive()) return;

  const endpoint =
    process.env.LANGSMITH_ENDPOINT?.trim() || "https://api.smith.langchain.com";
  const project = process.env.LANGSMITH_PROJECT?.trim() || "autotime-ai-quality-evals";

  try {
    await fetch(`${endpoint}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.LANGSMITH_API_KEY,
      },
      body: JSON.stringify({
        name: `${id} - ${name}`,
        run_type: "tool",
        project_name: project,
        status: passed ? "success" : "error",
        extra: { durationMs },
      }),
    });
  } catch (error) {
    // Never fail the eval suite because the optional reporting call failed.
    console.warn(`LangSmith reporting failed for ${id}:`, error.message);
  }
}
