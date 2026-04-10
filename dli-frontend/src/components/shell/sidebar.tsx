"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import {
  PRIMARY_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  type NavItem,
} from "@/config/constants";
import {
  formatUserBalance,
  getUserInitials,
  type ShellUser,
} from "@/components/shell/shell.types";

function isActiveLink(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLink({
  item,
  pathname,
  onNavigate,
  onAction,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: (() => void) | undefined;
  onAction?: (() => void) | undefined;
}) {
  const active = isActiveLink(pathname, item.href);
  const danger = item.accent === "danger";
  const className = [
    "group relative flex items-center gap-3 rounded-sm border border-transparent px-4 py-3 text-xs transition-colors",
    "font-mono uppercase tracking-[0.2em]",
    active
      ? "border-lime-400/30 bg-white/[0.04] text-lime-400 shadow-[inset_3px_0_0_0_#a3e635]"
      : danger
        ? "text-rose-200/75 hover:bg-white/[0.03] hover:text-rose-200"
        : "text-neutral-500 hover:bg-white/[0.03] hover:text-zinc-100",
  ].join(" ");
  const iconClassName = [
    "h-4 w-4 shrink-0 transition-transform",
    active ? "text-lime-400" : danger ? "text-rose-300/70" : "text-neutral-500",
    "group-hover:scale-105",
  ].join(" ");

  if (onAction) {
    return (
      <button type="button" onClick={onAction} className={className}>
        <item.icon className={iconClassName} />
        <span>{item.label}</span>
      </button>
    );
  }

  return (
    <Link href={item.href} onClick={onNavigate} className={className}>
      <item.icon className={iconClassName} />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({
  user,
  loading,
  mobileOpen = false,
  onClose,
}: {
  user: ShellUser | null;
  loading: boolean;
  mobileOpen?: boolean;
  onClose?: (() => void) | undefined;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const avatarLabel = getUserInitials(user?.name);
  const visiblePrimaryNavItems = PRIMARY_NAV_ITEMS.filter(
    (item) => item.href !== "/analytics" || user?.role === "admin",
  );

  function handleLogout() {
    onClose?.();
    window.localStorage.removeItem("token");
    router.replace("/login");
  }

  return (
    <>
      <div
        aria-hidden={!mobileOpen}
        onClick={onClose}
        className={[
          "fixed inset-0 z-40 bg-black/75 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <aside
        id="mobile-sidebar"
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/5 bg-black/90 backdrop-blur transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="relative flex h-20 items-center justify-center border-b border-[color:var(--line)] px-7">
          <Link
            href="/"
            aria-label="Go to the home page"
            onClick={onClose}
            className="inline-flex items-center gap-1 text-xl font-black italic tracking-tighter text-white"
          >
            <span>F.A.S.T.</span>
            <span className="font-bold not-italic text-lime-400">DLI</span>
          </Link>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="absolute right-5 grid h-10 w-10 place-items-center rounded-sm border border-white/8 bg-white/[0.03] text-neutral-500 transition hover:border-lime-400/25 hover:text-lime-400 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-5 py-6">
          <section className="panel-surface rounded-sm border border-[color:var(--line)] px-5 py-5">
            {loading ? (
              <div className="animate-pulse">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
                  Loading_Node...
                </p>
                <div className="mt-4 h-4 w-32 rounded bg-neutral-800" />
                <div className="mt-2 h-3 w-24 rounded bg-neutral-900" />
              </div>
            ) : (
              <>
                <p className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-lime-300">
                  {user?.name ?? "UNBOUND_NODE"}
                </p>
              </>
            )}

            <div className="mt-6 flex items-end justify-between gap-3 border-t border-[color:var(--line)] pt-5">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                  Available XP
                </p>
                {loading ? (
                  <div className="mt-2 h-8 w-24 animate-pulse rounded bg-neutral-800" />
                ) : (
                  <p className="mt-2 font-mono text-2xl font-semibold text-zinc-100">
                    {formatUserBalance(user?.points.balance)}
                  </p>
                )}
              </div>

              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-lime-400/25 bg-lime-400/10 font-mono text-xs text-lime-300">
                {loading ? (
                  "..."
                ) : user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={`${user.name} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarLabel
                )}
              </div>
            </div>
          </section>

          <nav className="mt-6 space-y-2">
            {visiblePrimaryNavItems.map((item) => (
              <NavigationLink
                key={item.label}
                item={item}
                pathname={pathname}
                onNavigate={onClose}
              />
            ))}
          </nav>

          {user?.role === "admin" && (
            <section className="panel-surface mt-6 rounded-sm border border-[color:var(--line)] px-5 py-5">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-500">
                System Pool Balance
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-lime-400 shadow-[0_0_12px_#a3e635]" />
                <p className="font-mono text-2xl font-semibold text-zinc-100">
                  {formatUserBalance(user?.systemPoolBalance)}
                </p>
              </div>
            </section>
          )}

          {user?.role === "admin" && (
            <button
              type="button"
              className="mt-6 rounded-sm bg-lime-400 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-neutral-950 transition hover:bg-lime-300"
            >
              Deploy New Task
            </button>
          )}

          <div className="mt-auto border-t border-[color:var(--line)] pt-5">
            <nav className="space-y-2">
              {SECONDARY_NAV_ITEMS.map((item) => (
                <NavigationLink
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  onNavigate={item.accent === "danger" ? undefined : onClose}
                  onAction={item.accent === "danger" ? handleLogout : undefined}
                />
              ))}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}

export function MobileNavigation({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const activeItem =
    PRIMARY_NAV_ITEMS.find((item) => isActiveLink(pathname, item.href)) ?? PRIMARY_NAV_ITEMS[0];

  return (
    <div className="relative z-20 border-b border-[color:var(--line)] bg-black/70 lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls="mobile-sidebar"
          className="inline-flex items-center gap-2 rounded-sm border border-white/8 bg-white/[0.03] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-400 transition hover:border-lime-400/25 hover:text-lime-400"
        >
          <Menu className="h-4 w-4" />
          {isOpen ? "Close" : "Menu"}
        </button>

        <div className="min-w-0 text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-neutral-500">
            Active Sector
          </p>
          <p className="truncate text-sm font-medium uppercase tracking-[0.12em] text-lime-400">
            {activeItem.label}
          </p>
        </div>
      </div>
    </div>
  );
}
