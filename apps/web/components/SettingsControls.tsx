"use client";

import { useEffect, useState } from "react";
import { getStatusTone } from "../lib/status-tone";
import {
  removeLocalMobilityProfile,
  removeMobilityConsent,
} from "../lib/international-mobility-storage";
import { createBrowserClient } from "../lib/supabase/client";
import type { AccountAiTone, SubscriptionPlan } from "../lib/supabase/types";

type SettingsControlsProps = {
  email: string;
  plan: SubscriptionPlan;
  userId: string;
};

type Preferences = {
  aiTone: AccountAiTone;
  defaultRegion: string;
  notificationsEnabled: boolean;
};

const dashboardStorageKey = "autotime-v2-companion-dashboard";
const defaultPreferences: Preferences = {
  aiTone: "coaching",
  defaultRegion: "United Kingdom",
  notificationsEnabled: false,
};

function getUserScopedStorageKey(baseKey: string, userId: string) {
  return `${baseKey}:${userId}`;
}

export function SettingsControls({
  email,
  plan,
  userId,
}: SettingsControlsProps) {
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);
  const [status, setStatus] = useState<string | null>(null);
  const [isBillingPending, setIsBillingPending] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [isPreferencesPending, setIsPreferencesPending] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/account/settings");
        const payload = (await response.json()) as {
          data: Preferences | null;
          error: string | null;
        };

        if (!isActive) {
          return;
        }

        if (!response.ok || !payload.data) {
          setStatus(payload.error ?? "Could not load account preferences.");
          return;
        }

        setPreferences(payload.data);
        setStatus(payload.error);
      } catch (error: unknown) {
        if (isActive) {
          setStatus(
            error instanceof Error
              ? error.message
              : "Could not load account preferences.",
          );
        }
      }
    }

    void loadPreferences();

    return () => {
      isActive = false;
    };
  }, [userId]);

  const savePreferences = async (next: Preferences) => {
    const previous = preferences;
    setPreferences(next);

    try {
      setIsPreferencesPending(true);
      const response = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const payload = (await response.json()) as {
        data: Preferences | null;
        error: string | null;
      };

      if (!response.ok || !payload.data) {
        setPreferences(previous);
        setStatus(payload.error ?? "Could not save account preferences.");
        return;
      }

      setPreferences(payload.data);
      setStatus(payload.error ?? "Preferences saved to this account.");
    } catch (error: unknown) {
      setPreferences(previous);
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not save account preferences.",
      );
    } finally {
      setIsPreferencesPending(false);
    }
  };

  const openBillingPortal = async () => {
    try {
      setIsBillingPending(true);
      setStatus(null);
      const route =
        plan === "pro" ? "/api/stripe/portal" : "/api/stripe/checkout";
      const response = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const payload = (await response.json()) as {
        data: { url: string } | null;
        error: string | null;
      };

      if (!response.ok || !payload.data) {
        setStatus(payload.error ?? "Billing is not available yet.");
        return;
      }

      window.location.href = payload.data.url;
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Billing failed.");
    } finally {
      setIsBillingPending(false);
    }
  };

  const signOut = async () => {
    try {
      setStatus(null);
      const response = await fetch("/auth/signout", { method: "POST" });
      const supabase = createBrowserClient();

      if (response.ok) {
        await supabase.auth.signOut({ scope: "local" });
      } else {
        const { error } = await supabase.auth.signOut();
        if (error) {
          setStatus(error.message);
          return;
        }
      }

      window.location.replace("/login?loggedOut=1");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Sign out failed.");
    }
  };

  const exportBrowserBackup = () => {
    const raw = window.localStorage.getItem(
      getUserScopedStorageKey(dashboardStorageKey, userId),
    );
    let payload: unknown = {
      exportedAt: new Date().toISOString(),
      message: "No browser dashboard backup was found for this account.",
    };

    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = {
          exportedAt: new Date().toISOString(),
          raw,
          warning: "Browser backup could not be parsed as JSON.",
        };
      }
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "autotime-dashboard-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Browser backup exported.");
  };

  const deleteAccountProfile = async () => {
    if (
      !window.confirm(
        "Delete the profile and mobility data saved to this account? Browser copies are removed only after both account deletions succeed. This does not delete your sign-in account.",
      )
    ) {
      return;
    }

    try {
      setIsDeletePending(true);
      setStatus(null);
      const mobilityResponse = await fetch("/api/sync/mobility", {
        method: "DELETE",
      });
      const mobilityPayload = (await mobilityResponse.json()) as {
        error: string | null;
      };
      const mobilityUnavailable = mobilityResponse.status === 404;

      if (
        !mobilityUnavailable &&
        (!mobilityResponse.ok || mobilityPayload.error)
      ) {
        setStatus(
          mobilityPayload.error ??
            "Mobility data could not be deleted, so account-profile deletion was stopped.",
        );
        return;
      }

      const profileResponse = await fetch("/api/sync/profile", {
        method: "DELETE",
      });
      const profilePayload = (await profileResponse.json()) as {
        error: string | null;
      };

      if (!profileResponse.ok || profilePayload.error) {
        setStatus(
          `Account profile deletion is incomplete: ${
            profilePayload.error ?? "the profile could not be deleted"
          }. Mobility data may already have been removed.`,
        );
        return;
      }

      removeLocalMobilityProfile(localStorage, userId);
      removeMobilityConsent(localStorage, userId);
      setStatus(
        "Account profile and mobility data deleted. The browser mobility copy was also removed. Your sign-in account still exists.",
      );
    } catch (error: unknown) {
      setStatus(
        error instanceof Error
          ? `Account-profile deletion is incomplete: ${error.message}`
          : "Account-profile deletion is incomplete.",
      );
    } finally {
      setIsDeletePending(false);
    }
  };
  return (
    <section className="settings-control-grid" aria-label="Settings controls">
      <article className="settings-control-panel">
        <div className="section-heading">
          <p className="eyebrow">Account</p>
          <h2>{email}</h2>
          <p>Manage sign-in methods and session controls.</p>
        </div>
        <div className="profile-action-row">
          <button className="secondary-button" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </article>

      <article className="settings-control-panel" id="billing-controls">
        <div className="section-heading">
          <p className="eyebrow">Plan & billing</p>
          <h2>{plan === "pro" ? "Pro plan" : "Free plan"}</h2>
          <p>
            Open checkout or the billing portal without duplicating pricing.
          </p>
        </div>
        <button
          disabled={isBillingPending}
          type="button"
          onClick={openBillingPortal}
        >
          {plan === "pro" ? "Manage billing" : "Upgrade plan"}
        </button>
      </article>

      <article className="settings-control-panel" id="data-controls">
        <div className="section-heading">
          <p className="eyebrow">Data & privacy</p>
          <h2>Backup and account data</h2>
          <p>
            Export a browser backup or remove synced profile data. This does not
            delete your sign-in account.
          </p>
        </div>
        <div className="profile-action-row">
          <button
            className="secondary-button"
            type="button"
            onClick={exportBrowserBackup}
          >
            Export backup
          </button>
          <button
            className="danger-button"
            disabled={isDeletePending}
            type="button"
            onClick={deleteAccountProfile}
          >
            Delete account profile
          </button>
        </div>
      </article>

      <article className="settings-control-panel">
        <div className="section-heading">
          <p className="eyebrow">Preferences</p>
          <h2>Defaults</h2>
          <p>
            Keep lightweight defaults here; evidence stays in Profile Evidence.
          </p>
        </div>
        <label>
          Default region
          <input
            value={preferences.defaultRegion}
            onBlur={() => void savePreferences(preferences)}
            onChange={(event) =>
              setPreferences({
                ...preferences,
                defaultRegion: event.target.value,
              })
            }
          />
        </label>
        <label>
          AI response style
          <select
            value={preferences.aiTone}
            onChange={(event) =>
              void savePreferences({
                ...preferences,
                aiTone: event.target.value as AccountAiTone,
              })
            }
          >
            <option value="concise">Concise</option>
            <option value="coaching">Coaching</option>
            <option value="detailed">Detailed</option>
          </select>
        </label>
        <label className="sync-consent-control">
          <input
            checked={preferences.notificationsEnabled}
            type="checkbox"
            onChange={(event) =>
              void savePreferences({
                ...preferences,
                notificationsEnabled: event.target.checked,
              })
            }
          />
          <span>
            {isPreferencesPending
              ? "Saving preferences..."
              : "Enable notification preferences when reminders ship."}
          </span>
        </label>
      </article>

      {status ? (
        <p className={`status-banner ${getStatusTone(status)}`}>{status}</p>
      ) : null}
    </section>
  );
}
