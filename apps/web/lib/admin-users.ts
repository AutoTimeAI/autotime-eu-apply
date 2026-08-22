import "server-only";
import { createAdminClient } from "./supabase/admin";

export type AdminUserRow = {
  betaStatus: string;
  createdAt: string;
  email: string | null | undefined;
  id: string;
  lastActiveAt: string | null;
};

export type AdminUsersPage = {
  users: AdminUserRow[];
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
};

const USERS_PER_PAGE = 50;

export async function getAdminUsersOverview(
  includeEmail: boolean,
  page = 1,
): Promise<AdminUsersPage> {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const admin = createAdminClient();
  const [{ data, error }, beta] = await Promise.all([
    admin.auth.admin.listUsers({ page: safePage, perPage: USERS_PER_PAGE }),
    admin.from("beta_access").select("user_id, status, updated_at"),
  ]);
  if (error || beta.error) throw new Error("user_source_unavailable");
  const betaByUser = new Map(
    (beta.data ?? []).map((row) => [row.user_id, row]),
  );
  const users = data.users.map((user) => ({
    betaStatus: betaByUser.get(user.id)?.status ?? "not_enrolled",
    createdAt: user.created_at,
    email: includeEmail ? (user.email ?? null) : undefined,
    id: user.id,
    lastActiveAt: user.last_sign_in_at ?? null,
  }));
  return {
    users,
    page: safePage,
    perPage: USERS_PER_PAGE,
    total: data.total,
    hasMore: data.nextPage !== null,
  };
}
