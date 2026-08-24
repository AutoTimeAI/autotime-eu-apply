"use client";

/** Supplies dashboard identity/plan context and responsive account navigation. */
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { getStatusTone } from "../lib/status-tone";
import { createBrowserClient } from "../lib/supabase/client";
import type { SubscriptionPlan } from "../lib/supabase/types";

type DashboardPlanContextValue = {
  plan: SubscriptionPlan;
  userId: string;
};

type UserNavProps = {
  email: string;
  isAdmin?: boolean;
  plan: SubscriptionPlan;
};

type DashboardNavItem = {
  aliases?: string[];
  description?: string;
  href: string;
  icon:
    | "home"
    | "direction"
    | "jobs"
    | "applications"
    | "interviews"
    | "countries"
    | "profile";
  label: string;
};

const DashboardPlanContext = createContext<DashboardPlanContextValue | null>(
  null,
);

/** Reads the nearest dashboard plan context. */
export function useDashboardPlan(): DashboardPlanContextValue {
  const context = useContext(DashboardPlanContext);

  if (!context) {
    throw new Error(
      "useDashboardPlan must be used inside DashboardPlanProvider",
    );
  }

  return context;
}

/** Provides resolved user and subscription data to dashboard descendants. */
export function DashboardPlanProvider({
  children,
  plan,
  userId,
}: {
  children: ReactNode;
  plan: SubscriptionPlan;
  userId: string;
}) {
  return (
    <DashboardPlanContext.Provider value={{ plan, userId }}>
      {children}
    </DashboardPlanContext.Provider>
  );
}

function getInitial(email: string): string {
  return email.trim().charAt(0).toUpperCase() || "A";
}

const dashboardWorkflowNavItems: DashboardNavItem[] = [
  {
    href: "/dashboard",
    icon: "home",
    label: "Home",
    description: "Your next action",
  },
  {
    href: "/dashboard/role-pathways",
    icon: "direction",
    label: "Career Direction",
    description: "Pathways and career lanes",
  },
  {
    aliases: ["/dashboard/match-score", "/dashboard/inbox"],
    href: "/dashboard/jobs",
    icon: "jobs",
    label: "Jobs",
    description: "Capture and analyse",
  },
  {
    aliases: [
      "/dashboard/application-answers",
      "/dashboard/documents",
      "/dashboard/follow-ups",
      "/dashboard/insights",
    ],
    href: "/dashboard/applications",
    icon: "applications",
    label: "Applications",
    description: "Prepare and track",
  },
  {
    aliases: ["/dashboard/interview"],
    href: "/dashboard/interviews",
    icon: "interviews",
    label: "Interviews",
    description: "Prepare with evidence",
  },
  {
    href: "/dashboard/international",
    icon: "countries",
    label: "Countries",
    description: "Country and mobility facts",
  },
  {
    aliases: ["/dashboard/autofill-profile", "/dashboard/cv-tailor"],
    href: "/dashboard/profile",
    icon: "profile",
    label: "Profile",
    description: "Facts and proof",
  },
];

function NavIcon({ name }: { name: DashboardNavItem["icon"] }) {
  const paths: Record<DashboardNavItem["icon"], ReactNode> = {
    home: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-7h6v7" />,
    direction: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" />
      </>
    ),
    jobs: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5h8v2M3 12h18M10 12v2h4v-2" />
      </>
    ),
    applications: (
      <>
        <path d="M7 3h10v4h3v14H4V7h3V3Z" />
        <path d="M8 3v5h8V3M8 13h8M8 17h6" />
      </>
    ),
    interviews: (
      <>
        <path d="M4 5h16v11H8l-4 4V5Z" />
        <path d="M8 9h8M8 12h5" />
      </>
    ),
    countries: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9S14.5 18.5 12 21M12 3C9.5 5.5 8.5 8.5 8.5 12S9.5 18.5 12 21" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className="workflow-nav-icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}
function isPathInSection(pathname: string, sectionPath: string) {
  return pathname === sectionPath || pathname.startsWith(`${sectionPath}/`);
}

function isActiveWorkflowNavItem(pathname: string, item: DashboardNavItem) {
  const sectionPaths = [item.href, ...(item.aliases ?? [])];

  return sectionPaths.some((sectionPath) =>
    sectionPath === "/dashboard"
      ? pathname === sectionPath
      : isPathInSection(pathname, sectionPath),
  );
}

/** Renders the responsive workflow navigation for authenticated pages. */
export function DashboardWorkflowSidebar() {
  const pathname = usePathname();
  const primaryMobile = dashboardWorkflowNavItems.filter((item) =>
    [
      "/dashboard",
      "/dashboard/jobs",
      "/dashboard/applications",
      "/dashboard/interviews",
    ].includes(item.href),
  );
  const moreMobile = dashboardWorkflowNavItems.filter((item) =>
    [
      "/dashboard/role-pathways",
      "/dashboard/international",
      "/dashboard/profile",
    ].includes(item.href),
  );
  const link = (item: DashboardNavItem, compact = false) => {
    const isActive = isActiveWorkflowNavItem(pathname, item);
    const visualLabel =
      compact && item.label === "Applications" ? "Apps" : item.label;
    return (
      <a
        aria-current={isActive ? "page" : undefined}
        aria-label={compact ? item.label : undefined}
        className={isActive ? "active" : undefined}
        href={item.href}
        key={item.href}
      >
        <span className="workflow-nav-title">
          <NavIcon name={item.icon} />
          <span>{visualLabel}</span>
        </span>
        {compact ? null : <small>{item.description}</small>}
      </a>
    );
  };
  return (
    <>
      <aside className="dashboard-sidebar" aria-label="Workflow navigation">
        <nav className="dashboard-workflow-nav">
          {dashboardWorkflowNavItems.map((item) => link(item))}
        </nav>
      </aside>
      <nav
        className="mobile-workflow-nav"
        aria-label="Mobile workflow navigation"
      >
        {primaryMobile.map((item) => link(item, true))}
        <details className="mobile-more-menu">
          <summary>
            <span className="mobile-more-icon" aria-hidden="true">
              ...
            </span>
            <span>More</span>
          </summary>
          <div>{moreMobile.map((item) => link(item, true))}</div>
        </details>
      </nav>
    </>
  );
}

/** Renders account actions and plan/admin status for the signed-in user. */
export function UserNav({ email, isAdmin = false, plan }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ right: 16, top: 72 });
  const planLabel = plan === "pro" ? "Pro" : "Free";
  const isPaid = plan !== "free";
  const menuId = "user-account-menu";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsideInteraction = (event: MouseEvent | TouchEvent) => {
      if (
        event.target instanceof Node &&
        !shellRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideInteraction);
    document.addEventListener("touchstart", closeOnOutsideInteraction);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideInteraction);
      document.removeEventListener("touchstart", closeOnOutsideInteraction);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const openBillingPortal = async () => {
    try {
      setStatus(null);

      if (!isPaid) {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            returnUrl: `${window.location.origin}/dashboard`,
          }),
        });
        const payload = (await response.json()) as {
          data: { url: string } | null;
          error: string | null;
        };

        if (!response.ok || !payload.data) {
          setStatus(payload.error ?? "Checkout is not available yet.");
          return;
        }

        window.location.href = payload.data.url;
        return;
      }

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const payload = (await response.json()) as {
        data: { url: string } | null;
        error: string | null;
      };

      if (!response.ok || !payload.data) {
        setStatus(payload.error ?? "Billing portal is not available yet.");
        return;
      }

      window.location.href = payload.data.url;
    } catch (error: unknown) {
      setStatus(
        error instanceof Error ? error.message : "Billing portal failed.",
      );
    }
  };

  const signOut = async () => {
    try {
      setStatus(null);
      const response = await fetch("/auth/signout", { method: "POST" });

      if (!response.ok) {
        const supabase = createBrowserClient();
        const { error } = await supabase.auth.signOut();

        if (error) {
          setStatus(error.message);
          return;
        }
      } else {
        const supabase = createBrowserClient();
        await supabase.auth.signOut({ scope: "local" });
      }

      window.location.replace("/login?loggedOut=1");
    } catch (error: unknown) {
      try {
        const supabase = createBrowserClient();
        const { error: signOutError } = await supabase.auth.signOut();

        if (signOutError) {
          setStatus(signOutError.message);
          return;
        }

        window.location.replace("/login?loggedOut=1");
        return;
      } catch (fallbackError: unknown) {
        setStatus(
          fallbackError instanceof Error
            ? fallbackError.message
            : error instanceof Error
              ? error.message
              : "Sign out failed.",
        );
      }
    }
  };

  return (
    <div className="user-nav-shell" ref={shellRef}>
      <button
        ref={triggerRef}
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="secondary-button user-nav-trigger"
        type="button"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        onClick={() => {
          const rect = triggerRef.current?.getBoundingClientRect();
          if (rect) {
            setMenuPosition({
              right: Math.max(10, window.innerWidth - rect.right),
              top: rect.bottom + 8,
            });
          }
          setIsOpen((current) => !current);
        }}
      >
        <span aria-hidden="true" className="user-avatar">
          {getInitial(email)}
        </span>
        <span className="user-nav-copy">
          <span>{email}</span>
          <strong className={isPaid ? "plan-badge pro" : "plan-badge"}>
            {planLabel}
          </strong>
        </span>
      </button>
      {isOpen
        ? createPortal(
            <div
              className="user-nav-menu user-nav-menu-portal"
              id={menuId}
              ref={menuRef}
              role="menu"
              style={{ right: menuPosition.right, top: menuPosition.top }}
            >
              <a
                className="secondary-button"
                href="/dashboard/extension"
                role="menuitem"
              >
                Extension
              </a>
              <a
                className="secondary-button"
                href="/dashboard/settings"
                role="menuitem"
              >
                Settings
              </a>
              {isAdmin ? (
                <a className="secondary-button" href="/admin" role="menuitem">
                  Admin panel
                </a>
              ) : null}
              <button
                className="secondary-button"
                role="menuitem"
                type="button"
                onClick={openBillingPortal}
              >
                {isPaid ? "Billing & Plan" : "Upgrade plan"}
              </button>
              <button
                className="secondary-button"
                role="menuitem"
                type="button"
                onClick={signOut}
              >
                Sign out
              </button>
              {status ? (
                <p className={`status-banner compact ${getStatusTone(status)}`}>
                  {status}
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
