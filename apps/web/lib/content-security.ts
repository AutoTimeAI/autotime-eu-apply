import { z } from "zod";

export const USER_TEXT_LIMITS = { short: 500, paragraph: 5_000, document: 100_000, listItems: 100 } as const;
const shortText = z.string().max(USER_TEXT_LIMITS.short);
const paragraphText = z.string().max(USER_TEXT_LIMITS.paragraph);

export const boundedCvSchema = z.object({
  contact: z.object({ name: shortText, email: shortText, phone: shortText, location: shortText, linkedin: shortText.optional() }),
  summary: paragraphText,
  experience: z.array(z.object({ title: shortText, company: shortText, dates: shortText, bullets: z.array(paragraphText).max(USER_TEXT_LIMITS.listItems) })).max(USER_TEXT_LIMITS.listItems),
  education: z.array(z.object({ degree: shortText, institution: shortText, dates: shortText })).max(USER_TEXT_LIMITS.listItems),
  skills: z.array(shortText).max(USER_TEXT_LIMITS.listItems),
});

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null; }
  catch { return null; }
}
