import "server-only";
import { createAdminClient } from "./supabase/admin";

export type AdminUserRow = {
  betaStatus: string;
  createdAt: string;
  email: string | null | undefined;
  id: string;
  lastActiveAt: string | null;
};

export async function getAdminUsersOverview(
  includeEmail: boolean,
): Promise<AdminUserRow[]> {
  const admin = createAdminClient();
  const [{ data, error }, beta] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 50 }),
    admin.from("beta_access").select("user_id, status, updated_at"),
  ]);
  if (error || beta.error) throw new Error("user_source_unavailable");
  const betaByUser = new Map(
    (beta.data ?? []).map((row) => [row.user_id, row]),
  );
  return data.users.map((user) => ({
    betaStatus: betaByUser.get(user.id)?.status ?? "not_enrolled",
    createdAt: user.created_at,
    email: includeEmail ? (user.email ?? null) : undefined,
    id: user.id,
    lastActiveAt: user.last_sign_in_at ?? null,
  }));
}
