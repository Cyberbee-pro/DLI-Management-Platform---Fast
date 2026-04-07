"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  OPERATOR_PROFILE,
  PRIMARY_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  type NavItem,
} from "@/config/constants";

function isActiveLink(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const active = isActiveLink(pathname, item.href);
  const danger = item.accent === "danger";

  return (
    <Link
      href={item.href}
      className={[
        "group relative flex items-center gap-3 rounded-sm border border-transparent px-4 py-3 text-xs transition-colors",
        "font-mono uppercase tracking-[0.2em]",
        active
          ? "border-lime-400/30 bg-white/[0.04] text-lime-300 shadow-[inset_3px_0_0_0_#a3e635]"
          : danger
            ? "text-rose-200/75 hover:bg-white/[0.03] hover:text-rose-200"
            : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100",
      ].join(" ")}
    >
      <item.icon
        className={[
          "h-4 w-4 shrink-0 transition-transform",
          active ? "text-lime-300" : danger ? "text-rose-300/70" : "text-zinc-500",
          "group-hover:scale-105",
        ].join(" ")}
      />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-white/5 bg-black/85 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-72 lg:flex-col lg:backdrop-blur">
      <div className="border-b border-[color:var(--line)] px-7 py-7">
        <Link href="/tasks" className="font-mono text-[1.7rem] font-bold uppercase tracking-tight text-lime-400">
          F.A.S.T.DLI
        </Link>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-5 py-6">
        <section className="panel-surface rounded-sm border border-[color:var(--line)] px-5 py-5">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-lime-300">
            {OPERATOR_PROFILE.handle}
          </p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
            {OPERATOR_PROFILE.clearance}
          </p>

          <div className="mt-6 flex items-end justify-between gap-3 border-t border-[color:var(--line)] pt-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">
                Available XP
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-zinc-100">
                {OPERATOR_PROFILE.availableXp}
              </p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-full border border-lime-400/25 bg-lime-400/10 font-mono text-xs text-lime-300">
              {OPERATOR_PROFILE.avatarInitials}
            </div>
          </div>
        </section>

        <nav className="mt-6 space-y-2">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <NavigationLink key={item.label} item={item} pathname={pathname} />
          ))}
        </nav>

        <section className="panel-surface mt-6 rounded-sm border border-[color:var(--line)] px-5 py-5">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
            System Pool Balance
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-lime-400 shadow-[0_0_12px_#a3e635]" />
            <p className="font-mono text-2xl font-semibold text-zinc-100">
              {OPERATOR_PROFILE.systemPoolBalance}
            </p>
          </div>
        </section>

        <button
          type="button"
          className="mt-6 rounded-sm bg-lime-400 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-black transition hover:bg-lime-300"
        >
          Deploy New Task
        </button>

        <div className="mt-auto border-t border-[color:var(--line)] pt-5">
          <nav className="space-y-2">
            {SECONDARY_NAV_ITEMS.map((item) => (
              <NavigationLink key={item.label} item={item} pathname={pathname} />
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <div className="border-b border-[color:var(--line)] bg-black/70 lg:hidden">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const active = isActiveLink(pathname, item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={[
                "whitespace-nowrap rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.28em]",
                active
                  ? "border-lime-400/40 bg-lime-400/15 text-lime-300"
                  : "border-white/8 bg-white/[0.02] text-zinc-500",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
