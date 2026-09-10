import { z } from "zod";
import { getUserScopedStorageKey } from "./dashboard-state-storage.ts";

export type TrustState = {
  officialSourceReviewed: boolean;
  officialSourceReviewedAt: string;
};

export type SyncPreferences = { profileAccountSyncEnabled: boolean };

export const defaultTrustState: TrustState = {
  officialSourceReviewed: false,
  officialSourceReviewedAt: "",
};
export const defaultSyncPreferences: SyncPreferences = {
  profileAccountSyncEnabled: false,
};

const trustStateStorageKey = "autotime-v2-trust-state";
const syncPreferenceStorageKey = "autotime-v2-sync-preferences";
const trustStateSchema = z.object({
  officialSourceReviewed: z.boolean().optional(),
  officialSourceReviewedAt: z.string().optional(),
});
const syncPreferencesSchema = z.object({
  profileAccountSyncEnabled: z.boolean().optional(),
});

function browserStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function getStoredTrustState(userId: string, storage: Storage | null = browserStorage()): TrustState {
  if (!storage) return defaultTrustState;
  try {
    const parsed = trustStateSchema.safeParse(JSON.parse(
      storage.getItem(getUserScopedStorageKey(trustStateStorageKey, userId)) ?? "null",
    ));
    return parsed.success ? { ...defaultTrustState, ...parsed.data } : defaultTrustState;
  } catch {
    return defaultTrustState;
  }
}

export function saveTrustState(state: TrustState, userId: string, storage: Storage = window.localStorage) {
  storage.setItem(getUserScopedStorageKey(trustStateStorageKey, userId), JSON.stringify(state));
}

export function getStoredSyncPreferences(userId: string, storage: Storage | null = browserStorage()): SyncPreferences {
  if (!storage) return defaultSyncPreferences;
  try {
    const parsed = syncPreferencesSchema.safeParse(JSON.parse(
      storage.getItem(getUserScopedStorageKey(syncPreferenceStorageKey, userId)) ?? "null",
    ));
    return parsed.success ? { ...defaultSyncPreferences, ...parsed.data } : defaultSyncPreferences;
  } catch {
    return defaultSyncPreferences;
  }
}

export function saveSyncPreferences(preferences: SyncPreferences, userId: string, storage: Storage = window.localStorage) {
  storage.setItem(getUserScopedStorageKey(syncPreferenceStorageKey, userId), JSON.stringify(preferences));
}
