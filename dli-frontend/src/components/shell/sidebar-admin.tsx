"use client";

import { SidebarShared } from "@/components/shell/sidebar-shared";
import { getPrimaryNavItemsForRole } from "@/components/shell/sidebar-nav";
import type { ShellUser } from "@/components/shell/shell.types";

export function SidebarAdmin(props: {
  user: ShellUser | null;
  loading: boolean;
  mobileOpen?: boolean;
  onClose?: (() => void) | undefined;
}) {
  return (
    <SidebarShared
      {...props}
      primaryNavItems={getPrimaryNavItemsForRole(props.user?.role)}
    />
  );
}
