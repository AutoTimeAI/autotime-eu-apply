"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { MobilityProfile } from "shared";
import {
  emptyMobilityProfile,
  loadMobilityConsent,
  loadMobilityProfile,
  removeLocalMobilityProfile,
  removeMobilityConsent,
  saveMobilityConsent,
  saveMobilityProfile,
} from "../../lib/international-mobility-storage";
import {
  confirmPersistedMobilityProfile,
  mobilityApiResponseSchema,
  mobilityConsentVersion,
  reconcileMobilityProfiles,
  type MobilityConsent,
  type MobilityServerRecord,
  type MobilitySyncState,
} from "../../lib/mobility-sync";

export type MobilityPersistenceController = {
  localMalformed: boolean;
  reviewRequired: boolean;
  conflict: {
    localProfile: MobilityProfile;
    serverProfile: MobilityProfile;
  } | null;
  consent: MobilityConsent | null;
  serverRecord: MobilityServerRecord | null;
  state: MobilitySyncState;
  status: string;
  deleteAccountCopy: () => Promise<void>;
  disableSync: () => Promise<void>;
  grantConsentAndSync: () => Promise<void>;
  keepServerVersion: () => void;
  markLocalChange: () => void;
  removeBrowserCopy: () => void;
  removeMalformedBrowserCopy: () => void;
  retry: () => Promise<void>;
  syncBrowserVersion: () => Promise<void>;
};

function failureState(error: unknown): {
  state: MobilitySyncState;
  message: string;
} {
  if (typeof navigator !== "undefined" && !navigator.onLine)
    return {
      state: "offline",
      message: "You appear to be offline. Your browser copy was retained.",
    };
  return {
    state: "error",
    message:
      error instanceof Error
        ? error.message
        : "Account sync could not be completed.",
  };
}

export function useMobilityPersistence({
  profile,
  setProfile,
  userId,
}: {
  profile: MobilityProfile;
  setProfile: Dispatch<SetStateAction<MobilityProfile>>;
  userId: string;
}): MobilityPersistenceController {
  const [state, setState] = useState<MobilitySyncState>("local-only");
  const [localMalformed, setLocalMalformed] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [status, setStatus] = useState("Stored in this browser only.");
  const [consent, setConsent] = useState<MobilityConsent | null>(null);
  const [serverRecord, setServerRecord] = useState<MobilityServerRecord | null>(
    null,
  );
  const [conflict, setConflict] =
    useState<MobilityPersistenceController["conflict"]>(null);

  const upload = useCallback(
    async (
      candidate: MobilityProfile,
      activeConsent: MobilityConsent,
      expectedUpdatedAt: string | null,
    ) => {
      setState("syncing");
      setStatus("Saving the confirmed mobility profile to your account…");
      try {
        const response = await fetch("/api/sync/mobility", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile: candidate,
            consent: activeConsent,
            expectedUpdatedAt,
          }),
        });
        const body: unknown = await response.json();
        if (response.status === 409) {
          setState("conflict");
          setStatus(
            "The account copy changed. Reload or review both versions before saving.",
          );
          return;
        }
        if (!response.ok) {
          const parsed = mobilityApiResponseSchema.safeParse(body);
          throw new Error(
            parsed.success && parsed.data.error
              ? parsed.data.error
              : "Account sync could not be completed.",
          );
        }
        const confirmed = confirmPersistedMobilityProfile({
          expected: candidate,
          response: body,
        });
        setServerRecord(confirmed);
        setConflict(null);
        setState("synced");
        setStatus(
          "Account copy confirmed. This browser copy remains until you remove it.",
        );
      } catch (error: unknown) {
        const failure = failureState(error);
        setState(failure.state);
        setStatus(failure.message);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const local = loadMobilityProfile(localStorage, userId);
    const storedConsent = loadMobilityConsent(localStorage, userId);
    setConsent(storedConsent);
    setProfile(local.profile);

    void (async () => {
      try {
        const response = await fetch("/api/sync/mobility");
        if (!active) return;
        if (response.status === 404) {
          setState("server-disabled");
          setStatus("Account sync is not available in this environment.");
          return;
        }
        if (response.status === 401) {
          setState("error");
          setStatus("Sign in again before using account sync.");
          return;
        }
        const body: unknown = await response.json();
        if (!response.ok)
          throw new Error("The account mobility profile could not be loaded.");
        const parsed = mobilityApiResponseSchema.parse(body);
        const reconciliation = reconcileMobilityProfiles({
          emptyProfile: emptyMobilityProfile,
          local: local.profile,
          localKind: local.source,
          server: parsed.data,
        });
        setServerRecord(parsed.data);
        if (parsed.data) setConsent(parsed.data.consent);

        if (reconciliation.kind === "malformed-local") {
          setLocalMalformed(true);
          setState("error");
          setStatus(
            "This browser copy cannot be synchronised. You can remove it after reviewing the issue.",
          );
        } else if (reconciliation.kind === "server-only") {
          setProfile(reconciliation.profile);
          setConsent(parsed.data?.consent ?? null);
          setState(parsed.data?.syncEnabled ? "synced" : "local-only");
          setStatus(
            parsed.data?.syncEnabled
              ? "Loaded the confirmed mobility profile from your account."
              : "Loaded your account copy. Automatic sync remains disabled.",
          );
        } else if (reconciliation.kind === "matching") {
          setState(parsed.data?.syncEnabled ? "synced" : "local-only");
          setStatus(
            parsed.data?.syncEnabled
              ? "Browser and account copies match."
              : "Copies match, but account sync is disabled.",
          );
        } else if (reconciliation.kind === "conflict") {
          setConflict(reconciliation);
          setState("conflict");
          setStatus("Browser and account copies differ. Choose which to keep.");
        } else if (reconciliation.kind === "local-only") {
          if (local.source === "legacy-migration") {
            setReviewRequired(true);
            setState("local-only");
            setStatus(
              "Review and save the migrated mobility facts before choosing account storage.",
            );
            return;
          }
          setState(storedConsent ? "upload-pending" : "consent-required");
          setStatus(
            storedConsent
              ? "Ready to save this browser copy to your account."
              : "Your mobility profile is stored only in this browser.",
          );
        } else {
          setState("local-only");
          setStatus("No mobility profile has been saved yet.");
        }
      } catch (error: unknown) {
        if (!active) return;
        const failure = failureState(error);
        setState(failure.state);
        setStatus(failure.message);
      }
    })();
    return () => {
      active = false;
    };
  }, [setProfile, userId]);

  const grantConsentAndSync = async () => {
    const granted = saveMobilityConsent(localStorage, userId, {
      version: mobilityConsentVersion,
      grantedAt: new Date().toISOString(),
    });
    setConsent(granted);
    await upload(profile, granted, serverRecord?.updatedAt ?? null);
  };

  const syncBrowserVersion = async () => {
    if (!consent) {
      setState("consent-required");
      setStatus("Confirm account storage before synchronising.");
      return;
    }
    await upload(profile, consent, serverRecord?.updatedAt ?? null);
  };

  const keepServerVersion = () => {
    if (!serverRecord) return;
    const saved = saveMobilityProfile(
      localStorage,
      userId,
      serverRecord.profile,
    );
    setProfile(saved);
    setConflict(null);
    setState(serverRecord.syncEnabled ? "synced" : "local-only");
    setStatus("This browser now uses the account version.");
  };

  const markLocalChange = () => {
    if (reviewRequired) {
      setReviewRequired(false);
      setState(consent ? "upload-pending" : "consent-required");
      setStatus(
        "Reviewed browser copy saved. Choose whether to store it with your account.",
      );
      return;
    }
    if (serverRecord) {
      setState("upload-pending");
      setStatus("Browser changes are saved locally and ready to sync.");
    }
  };
  const removeBrowserCopy = () => {
    removeLocalMobilityProfile(localStorage, userId);
    setStatus(
      serverRecord
        ? "Mobility data was removed from this browser. The account copy remains."
        : "Mobility data was removed from this browser.",
    );
  };

  const removeMalformedBrowserCopy = () => {
    removeLocalMobilityProfile(localStorage, userId);
    setLocalMalformed(false);
    setProfile({ ...emptyMobilityProfile });
    setState(serverRecord ? "synced" : "local-only");
    setStatus("The unreadable browser copy was removed.");
  };

  const deleteAccountCopy = async () => {
    try {
      const response = await fetch("/api/sync/mobility", {
        method: "DELETE",
      });
      const body = (await response.json()) as { error?: string | null };
      if (!response.ok)
        throw new Error(
          body.error ?? "Account mobility profile was not deleted.",
        );
      setServerRecord(null);
      setConflict(null);
      removeMobilityConsent(localStorage, userId);
      setConsent(null);
      setState("local-only");
      setStatus(
        "Mobility profile deleted from your account. This browser copy remains.",
      );
    } catch (error: unknown) {
      const failure = failureState(error);
      setState(failure.state);
      setStatus(failure.message);
    }
  };

  const disableSync = async () => {
    try {
      const response = await fetch("/api/sync/mobility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable-sync" }),
      });
      if (!response.ok) throw new Error("Account sync could not be disabled.");
      removeMobilityConsent(localStorage, userId);
      setConsent(null);
      setServerRecord((current) =>
        current ? { ...current, syncEnabled: false } : current,
      );
      setState("local-only");
      setStatus(
        "Account sync is disabled. The existing account copy was not deleted.",
      );
    } catch (error: unknown) {
      const failure = failureState(error);
      setState(failure.state);
      setStatus(failure.message);
    }
  };

  const retry = async () => {
    if (consent) await syncBrowserVersion();
    else setState("consent-required");
  };

  return {
    localMalformed,
    reviewRequired,
    conflict,
    consent,
    serverRecord,
    state,
    status,
    deleteAccountCopy,
    disableSync,
    grantConsentAndSync,
    keepServerVersion,
    markLocalChange,
    removeBrowserCopy,
    removeMalformedBrowserCopy,
    retry,
    syncBrowserVersion,
  };
}
