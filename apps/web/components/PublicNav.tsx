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
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/jobs", label: "Job Check" },
  { href: "/dashboard/applications", label: "Applications" },
  { href: "/dashboard/interview", label: "Interview" },
  { href: "/dashboard/extension", label: "Extension" },
  { href: "/pricing", label: "Pricing" }
]

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
          <span className="brand-name">AutoTime</span>
          <strong>EU Apply</strong>
        </span>
      </Link>
      <div className="product-nav-links">
        {user ? (
          <>
            {signedInNavItems.map((item) => (
              <Link
                aria-current={currentPath === item.href ? "page" : undefined}
                className={currentPath === item.href ? "active" : undefined}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
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
