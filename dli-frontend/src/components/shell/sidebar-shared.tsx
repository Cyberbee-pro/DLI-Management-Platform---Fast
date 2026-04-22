"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";

import {
  SECONDARY_NAV_ITEMS,
  type NavItem,
} from "@/config/constants";
import {
  formatUserBalance,
  getUserInitials,
  type ShellUser,
} from "@/components/shell/shell.types";
import { clearStoredToken } from "@/lib/session";

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
      <button type="button" onClick={onAction} className={`cursor-target ${className}`}>
        <item.icon className={iconClassName} />
        <span>{item.label}</span>
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      prefetch={true}
      onClick={onNavigate}
      className={`cursor-target ${className}`}
    >
      <item.icon className={iconClassName} />
      <span>{item.label}</span>
    </Link>
  );
}

export function SidebarShared({
  user,
  loading,
  mobileOpen = false,
  onClose,
  primaryNavItems,
}: {
  user: ShellUser | null;
  loading: boolean;
  mobileOpen?: boolean;
  onClose?: (() => void) | undefined;
  primaryNavItems: NavItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const avatarLabel = getUserInitials(user?.name);
  const operatorView = user?.role === "admin" || user?.role === "moderator";

  useEffect(() => {
    for (const item of primaryNavItems) {
      router.prefetch(item.href);
    }

    for (const item of SECONDARY_NAV_ITEMS) {
      if (item.accent !== "danger") {
        router.prefetch(item.href);
      }
    }
  }, [primaryNavItems, router]);

  function handleLogout() {
    onClose?.();
    clearStoredToken();
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
          "fixed inset-y-0 left-0 z-50 flex w-64 min-w-64 max-w-64 flex-col overflow-y-auto overflow-x-hidden border-r border-white/5 bg-black/90 backdrop-blur transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="relative flex h-20 items-center justify-center border-b border-(--line) px-7">
          <Link
            href="/"
            prefetch={true}
            aria-label="Go to the home page"
            onClick={onClose}
            className="cursor-target inline-flex items-center gap-1 text-xl font-black italic tracking-tighter text-white"
          >
            <span>F.A.S.T.</span>
            <span className="font-bold not-italic text-lime-400">DLI</span>
          </Link>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="cursor-target absolute right-5 grid h-10 w-10 place-items-center rounded-sm border border-white/8 bg-white/3 text-neutral-500 transition hover:border-lime-400/25 hover:text-lime-400 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 py-6">
          <section className="panel-surface rounded-sm border border-(--line) px-5 py-5">
            {loading ? (
              <div className="animate-pulse">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
                  Loading_Node...
                </p>
                <div className="mt-4 h-4 w-32 rounded bg-neutral-800" />
                <div className="mt-2 h-3 w-24 rounded bg-neutral-900" />
              </div>
            ) : (
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-lime-300">
                {user?.name ?? "UNBOUND_NODE"}
              </p>
            )}

            <div className="mt-6 flex min-w-0 items-end justify-between gap-3 border-t border-(--line) pt-5">
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                  {operatorView ? "Operator Mode" : "Available XP"}
                </p>
                {loading ? (
                  <div className="mt-2 h-8 w-24 animate-pulse rounded bg-neutral-800" />
                ) : (
                  <p className="mt-2 font-mono text-2xl font-semibold text-zinc-100">
                    {operatorView ? "PLATFORM" : formatUserBalance(user?.points.balance)}
                  </p>
                )}
              </div>

              <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-lime-400/25 bg-lime-400/10 font-mono text-xs text-lime-300">
                {loading ? (
                  "..."
                ) : user?.avatarData ? (
                  <Image
                    src={user.avatarData}
                    alt={`${user.name} avatar`}
                    fill
                    sizes="48px"
                    className="h-full w-full object-cover"
                  />
                ) : user?.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={`${user.name} avatar`}
                    fill
                    sizes="48px"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarLabel
                )}
              </div>
            </div>
          </section>

          <nav className="mt-6 space-y-2">
            {primaryNavItems.map((item) => (
              <NavigationLink
                key={item.label}
                item={item}
                pathname={pathname}
                onNavigate={onClose}
              />
            ))}
          </nav>

          <div className="mt-auto border-t border-(--line) pt-5">
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
