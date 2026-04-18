import { cookies } from "next/headers";

import DashboardClientRoleRouter from "@/components/dashboard/views/client-role-router";
import { decodeSessionToken, SESSION_COOKIE_NAME } from "@/lib/session-token";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  const role = token ? decodeSessionToken(token)?.role ?? null : null;

  if (role === "admin") {
    const { default: AdminView } = await import("@/components/dashboard/views/admin-view");
    return <AdminView />;
  }

  if (role === "moderator") {
    const { default: ModView } = await import("@/components/dashboard/views/mod-view");
    return <ModView />;
  }

  if (role === "member") {
    const { default: MemberView } = await import("@/components/dashboard/views/member-view");
    return <MemberView />;
  }

  return <DashboardClientRoleRouter />;
}
