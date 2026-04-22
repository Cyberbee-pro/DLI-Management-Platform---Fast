import { fetchApiJson } from "@/lib/api";

import type {
  ShellNotification,
  ShellNotificationsResponse,
  ShellProfileResponse,
  ShellUser,
} from "@/components/shell/shell.types";

export const shellKeys = {
  profile: (token: string) => ["shell-profile", token] as const,
  notifications: (token: string) => ["shell-notifications", token] as const,
};

export interface ShellNotificationsData {
  notifications: ShellNotification[];
  unreadCount: number;
}

export async function fetchShellProfile(token: string): Promise<ShellUser> {
  const payload = await fetchApiJson<ShellProfileResponse>({
    path: "/dashboard/me",
    token,
    fallbackMessage: "Failed to load node profile.",
  });

  if (!payload?.data?.user) {
    throw new Error("Profile response is missing the authenticated user.");
  }

  return {
    ...payload.data.user,
    systemPoolBalance:
      payload.data.systemConfig?.rewardPoolBalance ??
      payload.data.systemConfig?.systemPoolBalance ??
      null,
    rewardPoolBalance:
      payload.data.systemConfig?.rewardPoolBalance ??
      payload.data.systemConfig?.systemPoolBalance ??
      null,
  };
}

export async function fetchShellNotifications(token: string): Promise<ShellNotificationsData> {
  const payload = await fetchApiJson<ShellNotificationsResponse>({
    path: "/notifications?limit=12",
    token,
    fallbackMessage: "Failed to load notifications.",
  });

  return {
    notifications: Array.isArray(payload?.data?.notifications) ? payload.data.notifications : [],
    unreadCount: payload?.data?.unreadCount ?? 0,
  };
}
