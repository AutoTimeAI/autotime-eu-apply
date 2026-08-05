import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isAdminUser } from "../../lib/admin-access";
import { getRemainingAiCalls, getUserPlan } from "../../lib/feature-gate";
import { createServerClient } from "../../lib/supabase/server";
import { getTestAuthUser } from "../../lib/test-auth";
import { DashboardShell } from "../../components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    const testUser = getTestAuthUser();
    let user = testUser;

    if (!user) {
      const supabase = await createServerClient();
      const {
        data: { user: sessionUser },
        error,
      } = await supabase.auth.getUser();

      if (error || !sessionUser) {
        redirect("/login");
      }

      user = sessionUser;
    }

    const plan = await getUserPlan(user.id);
    const remainingCalls =
      plan === "free" ? await getRemainingAiCalls(user.id) : 0;
    const email = user.email ?? "account";
    const isAdmin = await isAdminUser(user);

    return (
      <DashboardShell
        email={email}
        isAdmin={isAdmin}
        plan={plan}
        remainingCalls={remainingCalls}
        userId={user.id}
      >
        {children}
      </DashboardShell>
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      redirect("/login");
    }

    redirect("/login");
  }
}
