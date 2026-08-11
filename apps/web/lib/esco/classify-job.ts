export type EscoOccupationCandidate = {
  id: string;
  preferredLabel: string;
  description?: string | null;
};
export type EscoClassification = {
  occupationId: string | null;
  confidence: number;
  method: "exact" | "token-overlap" | "unmatched";
};
const words = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );
export function classifyJobToEsco(
  title: string,
  description: string,
  occupations: EscoOccupationCandidate[],
): EscoClassification {
  const normalTitle = [...words(title)].join(" ");
  const exact = occupations.find(
    (item) => [...words(item.preferredLabel)].join(" ") === normalTitle,
  );
  if (exact) return { occupationId: exact.id, confidence: 1, method: "exact" };
  const jobWords = words(`${title} ${description.slice(0, 2000)}`);
  let best: EscoOccupationCandidate | undefined,
    bestScore = 0;
  for (const occupation of occupations) {
    const tokens = words(
      `${occupation.preferredLabel} ${occupation.description ?? ""}`,
    );
    const overlap =
      [...tokens].filter((token) => jobWords.has(token)).length /
      Math.max(tokens.size, 1);
    if (overlap > bestScore) {
      best = occupation;
      bestScore = overlap;
    }
  }
  return best && bestScore >= 0.3
    ? {
        occupationId: best.id,
        confidence: Number(bestScore.toFixed(3)),
        method: "token-overlap",
      }
    : { occupationId: null, confidence: 0, method: "unmatched" };
}
