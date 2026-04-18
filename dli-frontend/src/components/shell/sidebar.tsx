"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { PRIMARY_NAV_ITEMS } from "@/config/constants";
import { SidebarAdmin } from "@/components/shell/sidebar-admin";
import { SidebarMember } from "@/components/shell/sidebar-member";
import { getPrimaryNavItemsForRole } from "@/components/shell/sidebar-nav";
import type { ShellUser } from "@/components/shell/shell.types";

function isActiveLink(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
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
  if (user?.role === "member") {
    return (
      <SidebarMember
        user={user}
        loading={loading}
        mobileOpen={mobileOpen}
        onClose={onClose}
      />
    );
  }

  return (
    <SidebarAdmin
      user={user}
      loading={loading}
      mobileOpen={mobileOpen}
      onClose={onClose}
    />
  );
}

export function MobileNavigation({
  isOpen,
  onToggle,
  user,
}: {
  isOpen: boolean;
  onToggle: () => void;
  user?: ShellUser | null;
}) {
  const pathname = usePathname();
  const primaryNavItems = getPrimaryNavItemsForRole(user?.role);
  const activeItem =
    primaryNavItems.find((item) => isActiveLink(pathname, item.href)) ?? PRIMARY_NAV_ITEMS[0];

  return (
    <div className="relative z-20 border-b border-(--line) bg-black/70 lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls="mobile-sidebar"
          className="inline-flex items-center gap-2 rounded-sm border border-white/8 bg-white/3 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-400 transition hover:border-lime-400/25 hover:text-lime-400"
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
