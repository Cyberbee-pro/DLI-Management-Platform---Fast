import Link from "next/link";
import { Bell, Search, TerminalSquare } from "lucide-react";

import { getUserInitials, type ShellUser } from "@/components/shell/shell.types";

export function TopHeader({
  user,
  loading,
}: {
  user: ShellUser | null;
  loading: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--line)] bg-black/70 backdrop-blur-xl">
      <div className="flex h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="shrink-0 font-mono text-lg font-bold uppercase tracking-tight text-lime-400 lg:hidden">
          F.A.S.T.DLI
        </Link>

        <label className="ml-auto flex max-w-xl flex-1 items-center gap-3 rounded-sm border border-white/8 bg-white/[0.04] px-4 py-3 text-zinc-400 sm:max-w-md">
          <Search className="h-4 w-4 text-lime-300" />
          <input
            type="search"
            placeholder="Search terminal..."
            className="w-full bg-transparent font-mono text-sm tracking-[0.08em] text-zinc-200 outline-none placeholder:text-zinc-500"
          />
        </label>

        <button
          type="button"
          aria-label="Open notifications"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-white/8 bg-white/[0.02] text-zinc-300 transition hover:border-lime-400/25 hover:text-lime-300"
        >
          <Bell className="h-4 w-4" />
        </button>

        <button
          type="button"
          aria-label="Open terminal shortcuts"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-white/8 bg-white/[0.02] text-zinc-300 transition hover:border-lime-400/25 hover:text-lime-300"
        >
          <TerminalSquare className="h-4 w-4" />
        </button>

        <Link
          href="/account"
          aria-label="Open account settings"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-lime-400/20 bg-lime-400/10 font-mono text-xs uppercase tracking-[0.2em] text-lime-300 transition hover:border-lime-400/35 hover:bg-lime-400/15"
        >
          {loading ? (
            <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-lime-300/70" />
          ) : (
            getUserInitials(user?.name)
          )}
        </Link>
      </div>
    </header>
  );
}
