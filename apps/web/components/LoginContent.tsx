"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createBrowserClient } from "../lib/supabase/client";

type OAuthProvider = "github" | "google";

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Sign-in could not be started. Please try again.";
}

function LoginForm() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("error") || searchParams.get("message");
  const [status, setStatus] = useState<string | null>(
    authError
      ? `Failed: ${authError}`
      : searchParams.get("sessionExpired")
        ? "Session expired. Sign in again to continue."
        : searchParams.get("loggedOut")
          ? "You have been signed out."
          : null,
  );
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null,
  );
  const [accountConsent, setAccountConsent] = useState(false);
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  useEffect(() => {
    let isMounted = true;
    const supabase = createBrowserClient();

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setStatus(`Failed: ${error.message}`);
        return;
      }

      if (data.session) {
        setStatus("Already signed in. Redirecting to dashboard...");
        window.location.replace(redirectTo);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setStatus("Signed in. Redirecting to dashboard...");
        window.location.replace(redirectTo);
      }

      if (event === "SIGNED_OUT") {
        setStatus("Session expired. Sign in again to continue.");
        setPendingProvider(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [redirectTo]);

  const handleSignIn = async (provider: OAuthProvider) => {
    try {
      if (!accountConsent) {
        setStatus("Please confirm account access before continuing.");
        return;
      }

      setStatus("Opening secure sign-in...");
      setPendingProvider(provider);

      const supabase = createBrowserClient();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("redirectTo", redirectTo);
      const queryParams =
        provider === "google"
          ? {
              prompt: "consent select_account",
            }
          : undefined;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          queryParams,
          redirectTo: callbackUrl.toString(),
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setStatus(`Failed: ${error.message}`);
        setPendingProvider(null);
        return;
      }

      if (!data.url) {
        setStatus("Failed: sign-in URL was not returned. Please try again.");
        setPendingProvider(null);
        return;
      }

      setStatus("Redirecting to identity provider...");
      window.location.assign(data.url);
    } catch (error: unknown) {
      setStatus(`Failed: ${getErrorMessage(error)}`);
      setPendingProvider(null);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-intro" aria-labelledby="auth-intro-title">
        <div>
          <p className="eyebrow">Strategic European tech applications</p>
          <h1 id="auth-intro-title">
            Better applications.
            <br />
            Stronger interviews.
          </h1>
          <p>
            AutoTime helps you choose better European tech roles, prove fit with
            real evidence, and position every application around country,
            work-right and market reality. Quality over quantity, always.
          </p>
        </div>

        <div className="auth-proof-grid" aria-label="Product strengths">
          <div>
            <strong>Strategic targeting</strong>
            <span>
              Spend effort on roles where market, evidence and timing line up.
            </span>
          </div>
          <div>
            <strong>Country-aware fit</strong>
            <span>
              UK/EU country context, work-right clarity and sponsorship risk
              stay visible before you write.
            </span>
          </div>
          <div>
            <strong>Interview conversion</strong>
            <span>
              Evidence-backed positioning, follow-ups and prep focus on winning
              the right interviews.
            </span>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <div className="section-heading">
          <p className="eyebrow">Sign in</p>
          <h2>Open your dashboard</h2>
          <p>
            Track roles, check country-aware fit, build proof-backed content and
            prepare for interviews in one quality-first workspace.
          </p>
        </div>

        <label className="auth-consent-control">
          <input
            checked={accountConsent}
            type="checkbox"
            onChange={(event) => setAccountConsent(event.target.checked)}
          />
          <span>
            <strong>Account permission</strong>
            <small>
              I allow AutoTime to use this sign-in account for my dashboard,
              profile sync and billing access.
            </small>
          </span>
        </label>

        <div className="header-actions auth-provider-actions">
          <button
            disabled={Boolean(pendingProvider)}
            type="button"
            onClick={() => handleSignIn("github")}
          >
            {pendingProvider === "github"
              ? "Opening GitHub..."
              : "Sign in with GitHub"}
          </button>
          <button
            className="secondary-button"
            disabled={Boolean(pendingProvider)}
            type="button"
            onClick={() => handleSignIn("google")}
          >
            {pendingProvider === "google"
              ? "Opening Google..."
              : "Sign in with Google"}
          </button>
        </div>

        {!accountConsent && !status ? (
          <p className="auth-consent-hint">
            Confirm account permission first. The sign-in buttons will explain
            this if you click before ticking it.
          </p>
        ) : null}

        {status ? <p className="status-banner">{status}</p> : null}

        <p className="auth-privacy-note">
          EU-hosted analytics only - no email used for tracking - your data is
          never sold or shared.
        </p>
      </section>
    </main>
  );
}

export function LoginContent() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
