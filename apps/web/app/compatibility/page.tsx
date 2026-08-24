// Public /compatibility page. Publishes a dated evidence table of which job
// boards/ATS platforms the browser extension can capture, autofill, or read
// as a native feed for, sourced from the shared PLATFORM_COVERAGE dataset,
// plus a form for visitors to report a platform that isn't working. Server
// component, revalidated hourly; no auth required.
import type { Metadata } from "next";
import { PLATFORM_COVERAGE, getPublicCoverageSummary, isCoverageStale, type CoverageStatus } from "shared";
import { CompatibilityReportForm } from "../../components/CompatibilityReportForm";
import { PublicNav } from "../../components/PublicNav";
import styles from "./compatibility.module.css";

export const metadata: Metadata = { title: "Platform compatibility | AutoTime EU Apply", description: "Dated job capture, autofill and native-feed compatibility for AutoTime EU Apply." };
export const revalidate = 3600;

const labels: Record<CoverageStatus, string> = { verified:"Verified",partial:"Partial",manual_only:"Manual only",unsupported:"Not supported",unverified:"Unverified",not_applicable:"Not applicable" };

/**
 * Renders the platform-compatibility table: a summary strip (platform
 * count, verified capture integrations, verified native feeds) followed by
 * a per-platform row of capture/autofill/native-feed status pulled from
 * `PLATFORM_COVERAGE`, flagging rows as stale via `isCoverageStale` when
 * their `lastVerifiedAt` date is more than 30 days old.
 */
export default function CompatibilityPage() {
  const now = new Date();
  const summary = getPublicCoverageSummary(now);
  return <div className={styles.page}>
    <PublicNav currentPath="/compatibility" />
    <main className={styles.main}>
      <header className={styles.hero}><p className={styles.eyebrow}>Dated compatibility evidence</p><h1>Know what works before you apply.</h1><p>Coverage is reported separately for job capture, reviewed field filling and native job feeds. “Partial” means the workflow works on tested layouts but may need correction. AutoTime never submits an external application for you.</p></header>
      <section className={styles.summary} aria-label="Current compatibility summary"><div><strong>{summary.platforms}</strong><span>named platforms classified</span></div><div><strong>{summary.captureVerified}</strong><span>currently verified capture integrations</span></div><div><strong>{summary.nativeFeeds}</strong><span>currently verified native ATS feeds</span></div></section>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Platform</th><th>Job capture</th><th>Autofill</th><th>Native feed</th><th>Evidence</th><th>Limitation</th></tr></thead><tbody>{PLATFORM_COVERAGE.map((item) => { const stale=isCoverageStale(item.lastVerifiedAt,now); return <tr key={item.platform}><td className={styles.platform}>{item.platform}</td><td><span className={styles.status}>{labels[item.capture]}</span></td><td><span className={styles.status}>{labels[item.autofill]}</span></td><td><span className={styles.status}>{labels[item.nativeFeed]}</span></td><td><span className={`${styles.status} ${stale?styles.stale:""}`}>{stale?"Stale — ":"Checked "}{item.lastVerifiedAt}</span></td><td className={styles.limitation}>{item.publicLimitation}</td></tr>;})}</tbody></table></div>
      <section className={styles.report}><h2>Found a page that does not work?</h2><p>Send the public URL and symptom. Reports are rate-limited, stripped of query parameters, and reviewed before any compatibility claim changes.</p><CompatibilityReportForm /></section>
    </main>
  </div>;
}
