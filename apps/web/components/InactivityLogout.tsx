"use client";

// Invisible session-safety component mounted once inside DashboardShell.
// Tracks user activity via DOM listeners and force-signs-out (both the
// server session cookie and the local Supabase client) after one hour of
// no interaction, redirecting to /login. Renders no UI of its own.

import { useEffect, useRef } from "react";
import { createBrowserClient } from "../lib/supabase/client";

const INACTIVITY_LIMIT_MS = 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
] as const;

/**
 * Mounts activity listeners and a polling timer (checked every 30s) that
 * signs the user out after `INACTIVITY_LIMIT_MS` (1 hour) of no mouse,
 * keyboard, scroll or touch activity. Signs out via `/auth/signout` first,
 * falling back to a full Supabase sign-out if that request fails, then
 * redirects to `/login?sessionExpired=1`. Always returns `null`.
 */
export function InactivityLogout() {
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    const signOutForInactivity = async () => {
      try {
        const response = await fetch("/auth/signout", { method: "POST" });
        const supabase = createBrowserClient();

        if (response.ok) {
          await supabase.auth.signOut({ scope: "local" });
        } else {
          await supabase.auth.signOut();
        }
      } finally {
        window.location.replace("/login?sessionExpired=1");
      }
    };

    const intervalId = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_LIMIT_MS) {
        window.clearInterval(intervalId);
        void signOutForInactivity();
      }
    }, CHECK_INTERVAL_MS);

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, markActive, { passive: true }),
    );

    return () => {
      window.clearInterval(intervalId);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, markActive),
      );
    };
  }, []);

  return null;
}
