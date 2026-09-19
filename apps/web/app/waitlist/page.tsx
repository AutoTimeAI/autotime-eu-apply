/**
 * Public-but-authenticated waitlist page at /waitlist. A signed-in user
 * whose beta_access isn't 'active' is redirected here by
 * dashboard/layout.tsx instead of seeing the dashboard. Deliberately
 * requires only a session, not beta-active status, so this page itself
 * never causes the redirect loop it exists to break.
 */
import { redirect } from "next/navigation";
import { getTestAuthUser } from "../../lib/test-auth";
import { createServerClient } from "../../lib/supabase/server";
import { WaitlistContent } from "../../components/WaitlistContent";

export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  const testUser = getTestAuthUser();
  let email = testUser?.email ?? null;

  if (!email) {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }
    email = user.email ?? "your account";
  }

  return <WaitlistContent email={email} />;
}
