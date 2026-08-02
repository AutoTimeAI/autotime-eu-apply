"use client";

import { useState } from "react";
import type { AdminOverview } from "../../lib/admin-monitoring";

export function AdminRealtimeConsole({
  initialOverview,
}: {
  initialOverview: AdminOverview;
}) {
  const [overview, setOverview] = useState(initialOverview);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  async function refresh() {
    setRefreshing(true);
    setRefreshError("");
    try {
      const response = await fetch("/api/admin/overview", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: AdminOverview;
        error?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.error || "Refresh failed");
      setOverview(payload.data);
    } catch {
      setRefreshError("Operational data could not be refreshed.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className="operations-admin-page">
      <header className="operations-admin-page-header">
        <div>
          <p className="eyebrow">Canonical operational sources</p>
          <h1>Operations overview</h1>
          <p>
            Aggregate private-beta signals only. Browser-stored Jobs and
            Applications are development data and are not counted as durable
            production records.
          </p>
        </div>
        <button
          className="secondary-button"
          disabled={refreshing}
          onClick={() => void refresh()}
          type="button"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {overview.warnings.map((warning) => (
        <p className="notice-warning" key={warning}>
          {warning}
        </p>
      ))}
      {refreshError ? (
        <p className="notice-error" role="alert">
          {refreshError}
        </p>
      ) : null}

      <section
        aria-label="Operational metrics"
        className="operations-admin-grid"
      >
        {overview.metrics.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
            <small>Source: {item.source}</small>
          </article>
        ))}
      </section>

      <section className="admin-console-panel">
        <h2>Recent admin actions</h2>
        {overview.recentActions.status === "available" &&
        overview.recentActions.items.length ? (
          <ol className="admin-event-list">
            {overview.recentActions.items.map((item) => (
              <li key={`${item.action}-${item.createdAt}`}>
                <strong>{item.action}</strong>
                <span>
                  {item.targetType} ·{" "}
                  {new Date(item.createdAt).toLocaleString("en-GB")}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p>
            {overview.recentActions.status === "unauthorised"
              ? "Not authorised"
              : "Not instrumented"}
          </p>
        )}
      </section>
      <p>
        <small>
          Checked {new Date(overview.checkedAt).toLocaleString("en-GB")}
        </small>
      </p>
    </main>
  );
}
