"use client";

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
