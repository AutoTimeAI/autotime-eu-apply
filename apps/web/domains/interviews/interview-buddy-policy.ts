import type { ReusableAnswers } from "shared";

export type ReusableAnswerKey = keyof ReusableAnswers;

export function normaliseSentence(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function getMeaningfulTokens(value: string) {
  return value.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [];
}

function hasLikelyKeyboardNoise(value: string) {
  const compact = value.toLowerCase().replace(/[^a-z]/g, "");
  const tokens = getMeaningfulTokens(value);
  if (!compact) return true;

  const uniqueLetters = new Set(compact).size;
  const vowelCount = compact.match(/[aeiou]/g)?.length ?? 0;
  return (
    compact.length < 8 ||
    uniqueLetters <= 3 ||
    vowelCount / compact.length < 0.18 ||
    tokens.some((token) => /(.)\1{3,}/.test(token))
  );
}

export function validateInterviewBuddyInput({
  draft,
  question,
}: {
  draft: string;
  question: string;
}): string | null {
  const cleanQuestion = question.trim();
  const cleanDraft = draft.trim();
  if (cleanQuestion.length < 12 || getMeaningfulTokens(cleanQuestion).length < 3) {
    return "Please enter a real interview question before generating answers.";
  }
  if (hasLikelyKeyboardNoise(cleanQuestion)) {
    return "The question looks like random text. Add a clear interview question.";
  }
  if (cleanDraft.length < 30 || getMeaningfulTokens(cleanDraft).length < 6) {
    return "Please add a rough but meaningful answer with at least one real example, skill, or situation.";
  }
  if (hasLikelyKeyboardNoise(cleanDraft)) {
    return "The draft looks like random text. Add honest notes about what you did, learned, or achieved.";
  }
  return null;
}

export function isImmigrationRelatedQuestion(question: string) {
  return /\b(visa|immigration|sponsor|sponsorship|work permit|right to work|work authori[sz]ation|settled status|pre-settled|skilled worker)\b/i.test(question);
}

export function getInterviewBuddyDisclaimer(question: string) {
  return isImmigrationRelatedQuestion(question)
    ? "General career preparation only; check official sources or a qualified adviser for immigration decisions."
    : "";
}

export function inferReusableAnswerKey(question: string): ReusableAnswerKey {
  if (/\b(sponsor|sponsorship|visa|work permit)\b/i.test(question)) return "sponsorshipAnswer";
  if (/\b(work authori[sz]ation|right to work|work rights)\b/i.test(question)) return "workAuthorisationAnswer";
  if (/\b(relocat|move country|move to)\b/i.test(question)) return "relocationAnswer";
  if (/\b(notice)\b/i.test(question)) return "noticePeriodAnswer";
  if (/\b(availab|start date)\b/i.test(question)) return "availabilityAnswer";
  if (/\b(strength|strongest|best at)\b/i.test(question)) return "strengthsAnswer";
  return "motivationAnswer";
}

export function getReusableAnswerLabel(key: ReusableAnswerKey) {
  const labels: Record<ReusableAnswerKey, string> = {
    sponsorshipAnswer: "sponsorship answer",
    relocationAnswer: "relocation answer",
    workAuthorisationAnswer: "work authorisation answer",
    noticePeriodAnswer: "notice period answer",
    salaryExpectationAnswer: "salary expectation answer",
    motivationAnswer: "motivation answer",
    strengthsAnswer: "strengths answer",
    availabilityAnswer: "availability answer",
  };
  return labels[key];
}
