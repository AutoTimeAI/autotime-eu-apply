export type OutreachChannel = "linkedin_note" | "linkedin_inmail" | "email";
export type OutreachContactType = "recruiter" | "hiring_manager" | "peer_target_role";
export interface OutreachContext { jobTitle: string; companyName: string; jobDescription: string; recruiterName: string; recruiterRole: string; candidateSummary: string; candidateKeyStrengths: string[]; channel: OutreachChannel; contactType: OutreachContactType }
export const CHANNEL_CONSTRAINTS: Record<OutreachChannel, string> = {
  linkedin_note: "Maximum 300 characters. No subject line. One sentence of context, one sentence of value, and no ask beyond the connection itself.",
  linkedin_inmail: "Maximum 150 words. Include a subject under 60 characters and one clear, specific ask.",
  email: "Maximum 150 words. Include a subject. Use a professional register and one clear ask.",
};
// channel and contactType are closed enums validated by the request schema,
// so they're safe to interpolate into instructions. Everything else on
// OutreachContext is free text the caller supplied (job description,
// recruiter name, candidate summary, etc.) and must stay in the `input`
// channel only - interpolating it here would put attacker-influenced text
// in the higher-trust instructions channel, which every other AI helper in
// this codebase deliberately avoids.
export function buildOutreachInstructions(ctx: Pick<OutreachContext, "channel" | "contactType">): string {
  const purpose = ctx.contactType === "peer_target_role"
    ? "This person works in the target role at the same company. Use informational networking framing. Ask only for a 15-minute conversation about the role or team; do not ask about an application, referral, hiring decision, or candidate status."
    : "This person is involved in hiring. Use concise candidate-to-hiring-contact framing with one clear application-related ask.";
  return [`Draft a ${ctx.channel} outreach message from a job candidate to a same-company contact, using the role, recruiter and candidate details supplied as data.`,
    `Contact type: ${ctx.contactType}`, purpose, `Constraints: ${CHANNEL_CONSTRAINTS[ctx.channel]}`,
    "Reference one concrete detail from the supplied job description. No generic flattery, exclamation marks, or 'I hope this finds you well'. Do not invent facts. Output JSON with subject (string or null) and body (string).",
  ].join("\n");
}
