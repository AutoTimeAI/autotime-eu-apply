/**
 * /dashboard/autofill-profile — legacy path, renamed to
 * /dashboard/profile-evidence on 2026-09-22 (the old name described none
 * of what this page does and was confused with the browser extension's
 * unrelated autofill feature). Kept as a redirect so existing bookmarks,
 * emails and any external links still work.
 */
import { redirect } from "next/navigation";

export default async function LegacyAutofillProfileRedirect({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const target = returnTo
    ? `/dashboard/profile-evidence?returnTo=${encodeURIComponent(returnTo)}`
    : "/dashboard/profile-evidence";
  redirect(target);
}
