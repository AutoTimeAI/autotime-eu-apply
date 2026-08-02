import type { ReactNode } from "react";
import type { CapabilityReadiness } from "../lib/capability-readiness";

export type ProductStatus =
  | "confirmed"
  | "inferred"
  | "missing"
  | "conflicting"
  | "apply"
  | "consider"
  | "skip"
  | "insufficient";

export function ProductPageHeader({
  eyebrow,
  title,
  description,
  context,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  context?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="product-page-header">
      <div>
        {eyebrow ? <p className="product-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p>{description}</p>
        {context ? <div className="product-page-context">{context}</div> : null}
      </div>
      {action ? <div className="product-page-action">{action}</div> : null}
    </header>
  );
}

export function ProductSectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="product-section-header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function ProductStatusBadge({
  status,
  children,
}: {
  status: ProductStatus;
  children: ReactNode;
}) {
  return <span className={`product-status-badge ${status}`}>{children}</span>;
}

export function ProductEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="product-empty-state">
      <div aria-hidden="true" className="product-empty-state-mark" />
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div>{action}</div> : null}
    </section>
  );
}

export function ProductEvidencePanel({
  title,
  status,
  children,
  details,
}: {
  title: string;
  status: ProductStatus;
  children: ReactNode;
  details?: ReactNode;
}) {
  return (
    <section className="product-evidence-panel">
      <header>
        <h3>{title}</h3>
        <ProductStatusBadge status={status}>{status}</ProductStatusBadge>
      </header>
      <div>{children}</div>
      {details ? (
        <details>
          <summary>View evidence</summary>
          {details}
        </details>
      ) : null}
    </section>
  );
}

export function CapabilityReadinessNotice({
  readiness,
}: {
  readiness: CapabilityReadiness;
}) {
  if (
    readiness.state === "ready" &&
    readiness.recommendedMissing.length === 0
  ) {
    return null;
  }
  const needsInformation = readiness.state === "needs_information";
  return (
    <section
      aria-live="polite"
      className={`capability-readiness-notice ${readiness.state}`}
      role="status"
    >
      <ProductStatusBadge
        status={needsInformation ? "missing" : "insufficient"}
      >
        {needsInformation ? "Information needed" : "Ready with limitations"}
      </ProductStatusBadge>
      <h2>
        {needsInformation
          ? "Add the smallest missing detail"
          : "You can continue with limited analysis"}
      </h2>
      <p>{readiness.explanation}</p>
      {(needsInformation
        ? readiness.requiredMissing
        : readiness.recommendedMissing
      ).length ? (
        <ul>
          {(needsInformation
            ? readiness.requiredMissing
            : readiness.recommendedMissing
          ).map((item) => (
            <li key={item.id}>
              <strong>{item.label}</strong> — {item.reason}
            </li>
          ))}
        </ul>
      ) : null}
      {readiness.nextAction ? (
        <a
          className="secondary-button"
          href={
            readiness.nextAction.returnTo
              ? `${readiness.nextAction.href}?returnTo=${encodeURIComponent(
                  readiness.nextAction.returnTo,
                )}`
              : readiness.nextAction.href
          }
        >
          {readiness.nextAction.label}
        </a>
      ) : null}
    </section>
  );
}
