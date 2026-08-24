/** Deterministically maps job text to the closest supplied ESCO occupation. */
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
/** Scores exact-title and token-overlap matches without an external model call. */
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
  // Normalizing purely by the occupation's own vocabulary size only
  // breaks down when that vocabulary is tiny (e.g. a preferredLabel with
  // no description) - a single incidental shared word can then reach
  // confidence 1, indistinguishable from a real exact match. Normalizing
  // by the larger of the two vocabularies instead "fixes" that but badly
  // under-scores every legitimate match too, since a real job description
  // is naturally much longer than a terse occupation-taxonomy entry - that
  // size gap is expected, not a sign of a bad match. Requiring a minimum
  // occupation vocabulary size closes the degenerate case directly
  // without changing the score for any occupation with a real,
  // substantive description.
  const MIN_OCCUPATION_VOCAB = 4;
  let best: EscoOccupationCandidate | undefined,
    bestScore = 0;
  for (const occupation of occupations) {
    const tokens = words(
      `${occupation.preferredLabel} ${occupation.description ?? ""}`,
    );
    if (tokens.size < MIN_OCCUPATION_VOCAB) continue;
    const overlap =
      [...tokens].filter((token) => jobWords.has(token)).length /
      tokens.size;
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
