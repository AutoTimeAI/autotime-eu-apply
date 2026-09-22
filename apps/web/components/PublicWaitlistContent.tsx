"use client";

/** Public, unauthenticated beta-waitlist signup form for visitors without an account yet. */
import { useState } from "react";
import { getStatusTone } from "../lib/status-tone";

export function PublicWaitlistContent() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);

  const joinWaitlist = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setStatus("Enter your email address.");
      return;
    }

    setSubmitting(true);
    setStatus("Joining the waitlist...");

    try {
      const response = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = (await response.json()) as { data: { joined: boolean } | null; error: string | null };

      if (!response.ok || body.error || !body.data?.joined) {
        setStatus(body.error ?? "That didn't work. Check your email and try again.");
        setSubmitting(false);
        return;
      }

      setJoined(true);
      setStatus(`We'll email ${email.trim()} when a spot opens up.`);
      setSubmitting(false);
    } catch {
      setStatus("Request could not be completed. Try again shortly.");
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-intro" aria-labelledby="public-waitlist-intro-title">
        <div>
          <p className="eyebrow">AutoTime EU Apply · Beta</p>
          <h1 id="public-waitlist-intro-title">Join the private beta waitlist.</h1>
          <p>
            We&apos;re inviting a small cohort at a time. Leave your email and
            we&apos;ll reach out with an invite code as soon as a spot opens up.
          </p>
        </div>
      </section>

      <section className="auth-card">
        <div className="section-heading">
          <p className="eyebrow">Get an invite</p>
          <h2>Reserve your spot</h2>
          <p>No account needed yet - just your email.</p>
        </div>

        {joined ? (
          <>
            <p className={`status-banner ${getStatusTone(status ?? "")}`}>{status}</p>
            <p>
              While you wait, you can already{" "}
              <a
                href="https://chromewebstore.google.com/detail/autotime-eu-apply/cnddgochpdijpljflnbhpngacmmglmfn"
                target="_blank"
                rel="noreferrer"
              >
                install the AutoTime EU Apply Chrome extension
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <form onSubmit={joinWaitlist} className="header-actions auth-provider-actions">
              <label htmlFor="public-waitlist-email" className="sr-only">
                Email address
              </label>
              <input
                id="public-waitlist-email"
                type="email"
                value={email}
                disabled={submitting}
                placeholder="you@example.com"
                onChange={(event) => setEmail(event.target.value)}
              />
              <button type="submit" disabled={submitting}>
                {submitting ? "Joining..." : "Join waitlist"}
              </button>
            </form>

            {status ? (
              <p className={`status-banner ${getStatusTone(status)}`}>{status}</p>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
