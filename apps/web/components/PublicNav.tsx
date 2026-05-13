import Link from "next/link"
import { UserNav } from "./UserNav"
import type { SubscriptionPlan } from "../lib/supabase/types"

type PublicNavProps = {
  currentPath?: string
  user?: {
    email: string
    plan: SubscriptionPlan
  } | null
}

const signedInNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  {
    aliases: ["/dashboard/profile"],
    href: "/dashboard/autofill-profile",
    label: "Profile Evidence"
  },
  { href: "/dashboard/applications", label: "Tracked Jobs" },
  { href: "/dashboard/match-score", label: "Fit Analysis" },
  { href: "/dashboard/application-answers", label: "Application Kit" },
  { href: "/dashboard/cv-tailor", label: "Evidence Bank" },
  { href: "/dashboard/interview", label: "Interview Prep" },
  { href: "/dashboard/extension", label: "Extension" },
  { href: "/pricing", label: "Pricing" }
]

function isActiveSignedInNavItem(
  currentPath: string | undefined,
  item: (typeof signedInNavItems)[number]
) {
  if (!currentPath) {
    return false
  }

  const sectionPaths = [item.href, ...(item.aliases ?? [])]

  return sectionPaths.some((sectionPath) =>
    sectionPath === "/dashboard"
      ? currentPath === sectionPath
      : currentPath === sectionPath || currentPath.startsWith(`${sectionPath}/`)
  )
}

export function PublicNav({ currentPath, user }: PublicNavProps) {
  return (
    <nav className="product-nav" aria-label="Primary">
      <Link className="dashboard-brand" href={user ? "/dashboard" : "/"}>
        <img
          alt=""
          aria-hidden="true"
          className="brand-mark"
          src="/brand/autotime-mark.png"
        />
        <span className="brand-text">
          <span className="brand-title-line">
            <span className="brand-name">AutoTime AI</span>
          </span>
          <span className="brand-tagline">
            Better applications, not more noise.
          </span>
        </span>
      </Link>
      <div className="product-nav-links">
        {user ? (
          <>
            {signedInNavItems.map((item) => {
              const isActive = isActiveSignedInNavItem(currentPath, item)

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={isActive ? "active" : undefined}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              )
            })}
            <UserNav email={user.email} plan={user.plan} />
          </>
        ) : (
          <>
            <Link
              aria-current={currentPath === "/pricing" ? "page" : undefined}
              className={currentPath === "/pricing" ? "active" : undefined}
              href="/pricing"
            >
              Pricing
            </Link>
            <Link className="nav-cta" href="/login">
              Sign in
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
