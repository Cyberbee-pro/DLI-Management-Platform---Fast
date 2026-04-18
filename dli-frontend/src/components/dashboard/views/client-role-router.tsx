"use client";

import dynamic from "next/dynamic";

import { useSessionToken } from "@/lib/session";
import { decodeSessionToken } from "@/lib/session-token";

const AdminView = dynamic(() => import("@/components/dashboard/views/admin-view"));
const ModView = dynamic(() => import("@/components/dashboard/views/mod-view"));
const MemberView = dynamic(() => import("@/components/dashboard/views/member-view"));

export default function DashboardClientRoleRouter() {
  const { token, ready } = useSessionToken();
  const role = token ? decodeSessionToken(token)?.role ?? null : null;

  if (!ready) {
    return (
      <div className="panel-surface flex items-center gap-3 rounded-sm border border-neutral-800 px-5 py-5 text-sm text-zinc-400">
        <span className="font-mono uppercase tracking-[0.2em]">Syncing dashboard node...</span>
      </div>
    );
  }

  if (role === "admin") {
    return <AdminView />;
  }

  if (role === "moderator") {
    return <ModView />;
  }

  return <MemberView />;
}
