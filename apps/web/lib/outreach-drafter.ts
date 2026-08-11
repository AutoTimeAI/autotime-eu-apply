export type OutreachChannel = "linkedin_note" | "linkedin_inmail" | "email";
export type OutreachContactType = "recruiter" | "hiring_manager" | "peer_target_role";
export interface OutreachContext { jobTitle: string; companyName: string; jobDescription: string; recruiterName: string; recruiterRole: string; candidateSummary: string; candidateKeyStrengths: string[]; channel: OutreachChannel; contactType: OutreachContactType }
export const CHANNEL_CONSTRAINTS: Record<OutreachChannel, string> = {
  linkedin_note: "Maximum 300 characters. No subject line. One sentence of context, one sentence of value, and no ask beyond the connection itself.",
  linkedin_inmail: "Maximum 150 words. Include a subject under 60 characters and one clear, specific ask.",
  email: "Maximum 150 words. Include a subject. Use a professional register and one clear ask.",
};
export function buildOutreachPrompt(ctx: OutreachContext): string {
  const purpose = ctx.contactType === "peer_target_role"
    ? "This person works in the target role at the same company. Use informational networking framing. Ask only for a 15-minute conversation about the role or team; do not ask about an application, referral, hiring decision, or candidate status."
    : "This person is involved in hiring. Use concise candidate-to-hiring-contact framing with one clear application-related ask.";
  return [`Draft a ${ctx.channel} outreach message from a job candidate to a same-company contact.`,
    `Role: ${ctx.jobTitle} at ${ctx.companyName}`, `Job description: ${ctx.jobDescription}`,
    `Recruiter: ${ctx.recruiterName}, ${ctx.recruiterRole}`, `Candidate background: ${ctx.candidateSummary}`,
    `Contact type: ${ctx.contactType}`, purpose, `Candidate strengths: ${ctx.candidateKeyStrengths.join(", ")}`, `Constraints: ${CHANNEL_CONSTRAINTS[ctx.channel]}`,
    "Reference one concrete job-description detail. No generic flattery, exclamation marks, or 'I hope this finds you well'. Do not invent facts. Output JSON with subject (string or null) and body (string).",
  ].join("\n");
}
