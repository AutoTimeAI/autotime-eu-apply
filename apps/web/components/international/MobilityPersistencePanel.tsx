import type { MobilityPersistenceController } from "./useMobilityPersistence";

const stateLabels: Record<MobilityPersistenceController["state"], string> = {
  "local-only": "Browser only",
  "consent-required": "Consent required",
  "upload-pending": "Ready to sync",
  syncing: "Syncing",
  synced: "Synced",
  conflict: "Review needed",
  offline: "Offline",
  error: "Sync error",
  "server-disabled": "Account sync unavailable",
};

export function MobilityPersistencePanel({
  persistence,
}: {
  persistence: MobilityPersistenceController;
}) {
  const isBusy = persistence.state === "syncing";
  return (
    <section
      aria-labelledby="mobility-storage-heading"
      className="mobility-persistence-panel"
    >
      <div className="international-heading">
        <div>
          <p className="eyebrow">Storage and privacy</p>
          <h2 id="mobility-storage-heading">Mobility data storage</h2>
          <p>
            Choose whether this profile stays in this browser or is associated
            with your signed-in account. AutoTime uses it for application
            planning, not to make an immigration decision.
          </p>
        </div>
        <strong>{stateLabels[persistence.state]}</strong>
      </div>
      <p aria-live="polite" role="status">
        {persistence.status}
      </p>

      {persistence.state === "consent-required" &&
      !persistence.reviewRequired ? (
        <div className="mobility-consent">
          <p>
            If you continue, the mobility facts entered here—including work
            permission, sponsorship, timing, salary and notes—will be stored
            with this account. You can remove the account copy later. The
            browser copy remains until you remove it separately.
          </p>
          <button
            disabled={isBusy}
            onClick={persistence.grantConsentAndSync}
            type="button"
          >
            I agree — save to my account
          </button>
          <p>
            You can decline by taking no action; the profile will remain
            browser-only.
          </p>
        </div>
      ) : null}

      {persistence.state === "local-only" &&
      persistence.serverRecord &&
      !persistence.serverRecord.syncEnabled ? (
        <button
          disabled={isBusy}
          onClick={persistence.grantConsentAndSync}
          type="button"
        >
          Re-enable and sync to my account
        </button>
      ) : null}
      {persistence.state === "upload-pending" ? (
        <button
          disabled={isBusy}
          onClick={persistence.syncBrowserVersion}
          type="button"
        >
          Save browser copy to my account
        </button>
      ) : null}

      {persistence.conflict ? (
        <div className="mobility-conflict">
          <h3>Choose which version to keep</h3>
          <p>
            The browser and account copies differ. The account copy was last
            updated{" "}
            {persistence.serverRecord?.updatedAt ?? "at an unknown time"}.
          </p>
          <details>
            <summary>Review differences</summary>
            <dl>
              <div>
                <dt>Browser target countries</dt>
                <dd>
                  {persistence.conflict.localProfile.targetCountries.join(", ")}
                </dd>
              </div>
              <div>
                <dt>Account target countries</dt>
                <dd>
                  {persistence.conflict.serverProfile.targetCountries.join(
                    ", ",
                  )}
                </dd>
              </div>
              <div>
                <dt>Browser applicant position</dt>
                <dd>{persistence.conflict.localProfile.applicantPosition}</dd>
              </div>
              <div>
                <dt>Account applicant position</dt>
                <dd>{persistence.conflict.serverProfile.applicantPosition}</dd>
              </div>
            </dl>
          </details>
          <div className="mobility-actions">
            <button onClick={persistence.keepServerVersion} type="button">
              Keep account version
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Replace the account mobility profile with this browser's version?",
                  )
                )
                  void persistence.syncBrowserVersion();
              }}
              type="button"
            >
              Use this browser’s version
            </button>
          </div>
        </div>
      ) : null}

      {persistence.state === "offline" || persistence.state === "error" ? (
        <button onClick={persistence.retry} type="button">
          Retry account sync
        </button>
      ) : null}

      {persistence.localMalformed ? (
        <button
          className="secondary-button"
          onClick={persistence.removeMalformedBrowserCopy}
          type="button"
        >
          Remove unreadable browser copy
        </button>
      ) : null}

      {persistence.state !== "server-disabled" ? (
        <div className="mobility-data-controls">
          <button
            className="secondary-button"
            onClick={() => {
              if (
                window.confirm(
                  "Remove only this account's mobility data from this browser?",
                )
              )
                persistence.removeBrowserCopy();
            }}
            type="button"
          >
            Remove from this browser
          </button>
          {persistence.serverRecord ? (
            <>
              <button
                className="secondary-button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete the mobility profile stored with your account? The browser copy will remain.",
                    )
                  )
                    void persistence.deleteAccountCopy();
                }}
                type="button"
              >
                Delete account mobility profile
              </button>
              {persistence.serverRecord.syncEnabled ? (
                <button
                  className="secondary-button"
                  onClick={() => void persistence.disableSync()}
                  type="button"
                >
                  Disable account sync
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
