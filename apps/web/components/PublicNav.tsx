"use client"

import Link from "next/link"
import { UserNav } from "./UserNav"
import type { SubscriptionPlan } from "../lib/supabase/types"

type PublicNavProps = {
  currentPath?: string
  user?: {
    email: string
    id?: string
    plan: SubscriptionPlan
  } | null
}

type PublicNavItem = {
  aliases?: string[]
  href: string
  label: string
}

const signedInNavItems: PublicNavItem[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/extension", label: "Extension" },
  { href: "/pricing", label: "Plans" },
  { href: "/compatibility", label: "Compatibility" },
  { href: "/dashboard/settings", label: "Settings" }
]

function isActiveSignedInNavItem(
  currentPath: string | undefined,
  item: PublicNavItem
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
            <span className="brand-name">EU Apply</span>
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
              aria-current={currentPath === "/compatibility" ? "page" : undefined}
              className={currentPath === "/compatibility" ? "active" : undefined}
              href="/compatibility"
            >
              Compatibility
            </Link>
            <Link
              aria-current={currentPath === "/pricing" ? "page" : undefined}
              className={currentPath === "/pricing" ? "active" : undefined}
              href="/pricing"
            >
              Plans
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
