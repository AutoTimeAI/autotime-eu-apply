import type { ReactNode } from "react";
import {
  hasAdminPermission,
  requireAdminPageAccess,
  type AdminPermission,
} from "../../lib/admin-authorization";

export const dynamic = "force-dynamic";

const items: Array<[string, string, AdminPermission]> = [
  ["Overview", "/admin", "overview:read"],
  ["Users", "/admin/users", "users:read"],
  ["Feedback", "/admin/feedback", "feedback:read"],
  ["AI Operations", "/admin/ai-operations", "ai_operations:read"],
  ["Market Data", "/admin/market-data", "market_data:read"],
  ["Feature Flags", "/admin/feature-flags", "feature_flags:read"],
  ["Audit Log", "/admin/audit-log", "audit:read"],
] as const;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const principal = await requireAdminPageAccess("overview:read");
  const environment =
    process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
  return (
    <div className="operations-admin-shell">
      <header className="operations-admin-header">
        <div>
          <p className="eyebrow">EU Apply Operations Admin</p>
          <strong>Private beta operations</strong>
        </div>
        <div className="operations-admin-identity">
          <span>{environment}</span>
          <span>{principal.membership.role}</span>
          <span>{principal.user.email ?? principal.user.id}</span>
          <a href="/dashboard">Return to EU Apply</a>
        </div>
      </header>
      <nav aria-label="Admin sections" className="operations-admin-nav">
        {items
          .filter(([, , permission]) =>
            hasAdminPermission(principal.membership, permission),
          )
          .map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
      </nav>
      <div className="operations-admin-content">{children}</div>
    </div>
  );
}
