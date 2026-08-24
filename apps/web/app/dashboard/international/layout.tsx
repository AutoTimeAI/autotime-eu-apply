/**
 * Layout for the /dashboard/international route group.
 *
 * Purely loads the CSS bundles specific to the international/mobility
 * workspace (international.css, phase-5-countries.css) and passes children
 * through unchanged — it adds no additional chrome of its own (the shared
 * dashboard shell comes from the parent /dashboard layout).
 */
import type { ReactNode } from "react";
import "./international.css";
import "./phase-5-countries.css";

export default function InternationalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
