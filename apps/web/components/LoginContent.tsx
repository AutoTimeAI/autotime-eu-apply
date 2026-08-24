"use client";

/** Runs email and OAuth sign-in flows with bounded, user-facing diagnostics. */
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { reportClientIssue } from "../lib/client-diagnostics";
import { getStatusTone } from "../lib/status-tone";
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
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const [identityProviderLabel, setIdentityProviderLabel] = useState<string | null>(null);
  const oauthStartedRef = useRef(false);
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  useEffect(() => {
    let isMounted = true;
    const supabase = createBrowserClient();

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setStatus(`Failed: ${error.message}`);
        reportClientIssue({
          area: "auth",
          code: "auth.session.read.failed",
          message: error.message,
        });
        return;
      }

      if (data.session) {
        setHasExistingSession(true);
        try {
          const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities();
          if (!isMounted) {
            return;
          }

          if (!identitiesError) {
            const providers = identities.identities
              .map((identity) => identity.provider)
              .filter(Boolean);
            const providerLabel = providers.includes("github")
              ? "GitHub"
              : providers.includes("google")
                ? "Google"
                : null;
            setIdentityProviderLabel(providerLabel);
          }
        } catch {
          setIdentityProviderLabel(null);
        }
        setStatus(
          "You are already signed in. Confirm access below to continue.",
        );
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && oauthStartedRef.current) {
        setStatus("Signed in. Redirecting to dashboard...");
        window.location.replace(redirectTo);
      }

      if (event === "SIGNED_IN" && session && !oauthStartedRef.current) {
        setHasExistingSession(true);
        setStatus(
          "You are already signed in. Confirm access below to continue.",
        );
      }

      if (event === "SIGNED_OUT") {
        setHasExistingSession(false);
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

      oauthStartedRef.current = true;
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
        reportClientIssue({
          area: "auth",
          code: "auth.oauth.start.failed",
          message: error.message,
          metadata: { provider },
        });
        oauthStartedRef.current = false;
        setPendingProvider(null);
        return;
      }

      if (!data.url) {
        const message = "Failed: sign-in URL was not returned. Please try again.";
        setStatus(message);
        reportClientIssue({
          area: "auth",
          code: "auth.oauth.missing-url",
          message,
          metadata: { provider },
        });
        oauthStartedRef.current = false;
        setPendingProvider(null);
        return;
      }

      setStatus("Taking you to the sign-in provider...");
      window.location.assign(data.url);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setStatus(`Failed: ${message}`);
      reportClientIssue({
        area: "auth",
        code: "auth.oauth.unhandled",
        message,
        metadata: { provider },
      });
      oauthStartedRef.current = false;
      setPendingProvider(null);
    }
  };

  const continueWithExistingSession = () => {
    if (!accountConsent) {
      setStatus("Please confirm account access before continuing.");
      return;
    }

    setStatus("Permission confirmed. Opening dashboard...");
    window.location.assign(redirectTo);
  };

  const resetSession = async () => {
    try {
      setStatus(null);
      setPendingProvider(null);
      oauthStartedRef.current = false;
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
      setHasExistingSession(false);
      setIdentityProviderLabel(null);
      setAccountConsent(false);
      setStatus("Signed out. Choose Google or GitHub to authenticate again.");
    } catch (error: unknown) {
      setStatus(
        error instanceof Error
          ? `Failed: ${error.message}`
          : "Failed: could not reset the current session.",
      );
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
            <strong>Allow AutoTime to connect this account?</strong>
            <small>
              This lets us create your profile, keep your information in sync,
              and give you access to your dashboard. You can disconnect it
              later in Settings.
            </small>
          </span>
        </label>

        {hasExistingSession ? (
          <>
            {identityProviderLabel ? (
              <p className="auth-session-summary">
                <span>Signed in with</span>
                <strong>{identityProviderLabel}</strong>
              </p>
            ) : null}
            <div className="header-actions auth-provider-actions">
              <button
                disabled={Boolean(pendingProvider)}
                type="button"
                onClick={continueWithExistingSession}
              >
                Continue to dashboard
              </button>
              <button
                className="auth-switch-account"
                disabled={Boolean(pendingProvider)}
                type="button"
                onClick={resetSession}
              >
                Use a different account
              </button>
            </div>
          </>
        ) : (
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
        )}

        {!accountConsent && !status ? (
          <p className="auth-consent-hint">
            Confirm access to continue securely.
          </p>
        ) : null}

        {status ? (
          <p className={`status-banner ${getStatusTone(status)}`}>{status}</p>
        ) : null}

        <p className="auth-privacy-note">
          Analytics runs only after you consent. Your data is never sold and is
          shared only with the service providers disclosed in our{` `}
          <a href="/privacy">privacy policy</a>. Review our <a href="/terms">terms</a>.
        </p>
      </section>
    </main>
  );
}

/** Renders the interactive login experience behind the server login page. */
export function LoginContent() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
