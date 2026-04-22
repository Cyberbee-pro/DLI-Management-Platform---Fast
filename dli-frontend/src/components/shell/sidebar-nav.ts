import {
  PRIMARY_NAV_ITEMS,
  type NavItem,
} from "@/config/constants";
import type { ShellUser } from "@/components/shell/shell.types";

export function getPrimaryNavItemsForRole(role?: ShellUser["role"] | null): NavItem[] {
  return PRIMARY_NAV_ITEMS.filter((item) => {
    if (item.href === "/analytics") {
      return role === "admin" || role === "moderator";
    }

    return true;
  });
}
