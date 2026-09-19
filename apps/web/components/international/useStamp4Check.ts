"use client";

import { useEffect, useState } from "react";
import type { CountryPack, Stamp4SponsorshipAssessment } from "shared";

/**
 * Manages the explicit "check against Stamp4's real statutory thresholds"
 * action (POST /api/international/stamp4-check) for the currently selected
 * country/job-text pair. Deliberately a separate, user-triggered action
 * rather than part of the assessment's own recompute-on-every-keystroke
 * useMemo - a fetch on every keystroke would hammer the service. A previous
 * check's result is only valid for the country/wording it was run against,
 * so it's cleared whenever either changes.
 */
export function useStamp4Check({
  jobText,
  pack,
  selectedCountry,
}: {
  jobText: string;
  pack: CountryPack;
  selectedCountry: string;
}) {
  const [stamp4Assessment, setStamp4Assessment] =
    useState<Stamp4SponsorshipAssessment | null>(null);
  const [stamp4CheckState, setStamp4CheckState] = useState<
    "idle" | "loading" | "error"
  >("idle");

  useEffect(() => {
    setStamp4Assessment(null);
    setStamp4CheckState("idle");
  }, [selectedCountry, jobText]);

  const checkStamp4Thresholds = async () => {
    if (!jobText.trim()) return;
    setStamp4CheckState("loading");
    try {
      const response = await fetch("/api/international/stamp4-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryPackId: pack.id,
          roleTitle: jobText.trim().split("\n")[0]?.slice(0, 200) || pack.displayName,
          country: pack.displayName,
          rawText: jobText,
        }),
      });
      const body = (await response.json()) as {
        data: Stamp4SponsorshipAssessment | null;
        error: string | null;
      };
      if (!response.ok || body.error) {
        setStamp4CheckState("error");
        return;
      }
      setStamp4Assessment(body.data);
      setStamp4CheckState("idle");
    } catch {
      setStamp4CheckState("error");
    }
  };

  return { stamp4Assessment, stamp4CheckState, checkStamp4Thresholds };
}
