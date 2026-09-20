"use client";

/** Waitlist message plus a self-serve invite-code unlock form. */
import { useState } from "react";
import { getStatusTone } from "../lib/status-tone";

export function WaitlistContent({ email }: { email: string }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redeemCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      setStatus("Enter the invite code you were given.");
      return;
    }

    setSubmitting(true);
    setStatus("Checking your invite code...");

    try {
      const response = await fetch("/api/beta/redeem-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const body = (await response.json()) as { data: { activated: boolean } | null; error: string | null };

      if (!response.ok || body.error || !body.data?.activated) {
        setStatus(body.error ?? "That invite code isn't valid. Check it and try again.");
        setSubmitting(false);
        return;
      }

      setStatus("You're in! Taking you to your dashboard...");
      window.location.assign("/dashboard");
    } catch {
      setStatus("Request could not be completed. Try again shortly.");
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-intro" aria-labelledby="waitlist-intro-title">
        <div>
          <p className="eyebrow">AutoTime EU Apply · Beta</p>
          <h1 id="waitlist-intro-title">
            You&apos;re on the beta waitlist.
          </h1>
          <p>
            We&apos;ll email {email} as soon as your account is approved. If you
            already have an invite code, you can unlock access right now.
          </p>
        </div>
      </section>

      <section className="auth-card">
        <div className="section-heading">
          <p className="eyebrow">Have an invite code?</p>
          <h2>Unlock your account</h2>
          <p>Enter the code you were given to skip the waitlist.</p>
        </div>

        <form onSubmit={redeemCode} className="header-actions auth-provider-actions">
          <label htmlFor="waitlist-invite-code" className="sr-only">
            Invite code
          </label>
          <input
            id="waitlist-invite-code"
            type="text"
            value={code}
            disabled={submitting}
            placeholder="Invite code"
            onChange={(event) => setCode(event.target.value)}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Checking..." : "Unlock access"}
          </button>
        </form>

        {status ? (
          <p className={`status-banner ${getStatusTone(status)}`}>{status}</p>
        ) : null}
      </section>
    </main>
  );
}
