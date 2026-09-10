import { companionDashboardStateSchema, type CandidateProfile, type CompanionDashboardState } from "shared";
import { loadMobilityProfile } from "../../lib/international-mobility-storage.ts";
import {
  clearLegacyProfilePlaceholders,
  dashboardStorageKey,
  defaultDashboardState,
  getUserScopedStorageKey,
  isLegacySampleState,
  normalizeLegacyDashboardState,
} from "./dashboard-state-storage.ts";

export type MobilityCountryPrefill = {
  patch: Partial<CandidateProfile>;
  applied: { currentCountry: boolean; targetCountries: boolean };
};

function browserStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function computeMobilityCountryPrefill(
  profile: CandidateProfile,
  userId: string,
  storage: Storage | null = browserStorage(),
): MobilityCountryPrefill | null {
  if (!storage) return null;
  try {
    const mobility = loadMobilityProfile(storage, userId);
    if (mobility.source !== "saved") return null;
    const currentCountry = mobility.profile.currentCountry.trim();
    const targetCountries = mobility.profile.targetCountries.map((country) => country.trim()).filter(Boolean).join(", ");
    const applied = {
      currentCountry: !profile.currentCountry.trim() && currentCountry.length > 0,
      targetCountries: !profile.targetCountries.trim() && targetCountries.length > 0,
    };
    if (!applied.currentCountry && !applied.targetCountries) return null;
    return {
      patch: {
        ...(applied.currentCountry ? { currentCountry } : {}),
        ...(applied.targetCountries ? { targetCountries } : {}),
      },
      applied,
    };
  } catch {
    return null;
  }
}

export function getBestStoredProfileRecovery(
  userId: string,
  minimumReadiness: number,
  getReadiness: (state: CompanionDashboardState) => number,
  storage: Storage | null = browserStorage(),
) {
  if (!storage) return null;
  const currentStorageKey = getUserScopedStorageKey(dashboardStorageKey, userId);
  let best: { readiness: number; state: CompanionDashboardState; storageKey: string } | null = null;
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || key === currentStorageKey || !key.startsWith(`${dashboardStorageKey}:`)) continue;
    try {
      const parsed = normalizeLegacyDashboardState(JSON.parse(storage.getItem(key) ?? "null"));
      const result = companionDashboardStateSchema.safeParse(parsed);
      if (!result.success || isLegacySampleState(result.data)) continue;
      const state = clearLegacyProfilePlaceholders({
        ...defaultDashboardState,
        ...result.data,
        evidenceRecords: result.data.evidenceRecords ?? [],
        outcomeRecords: result.data.outcomeRecords ?? [],
      });
      const readiness = getReadiness(state);
      if (readiness > minimumReadiness && (!best || readiness > best.readiness)) {
        best = { readiness, state, storageKey: key };
      }
    } catch {
      continue;
    }
  }
  return best;
}
