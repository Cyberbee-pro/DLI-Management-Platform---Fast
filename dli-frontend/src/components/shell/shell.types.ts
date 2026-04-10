export interface ShellUser {
  _id: string;
  name: string;
  role: "member" | "admin";
  avatarUrl?: string | null;
  avatarData?: string | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  resumeUrl?: string | null;
  systemPoolBalance?: number | string | null;
  points: {
    balance: number | string;
  };
}

export interface ShellNotification {
  _id: string;
  type:
    | "DEADLINE_REMINDER"
    | "HOT_BOUNTY"
    | "POINTS_APPROVED"
    | "TASK_TRANSFER"
    | "COURSE_APPROVED"
    | "PROFILE_QUERY";
  channel: "email" | "discord" | "slack" | "in_app";
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  sentAt: string;
}

export interface ShellProfileResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: {
    user: ShellUser;
    systemConfig?: {
      systemPoolBalance?: number | string | null;
    } | null;
  };
}

export interface ShellNotificationsResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: {
    notifications: ShellNotification[];
    unreadCount: number;
  };
}

export function formatUserBalance(value: number | string | null | undefined) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value ?? "0");

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return numericValue.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

export function getUserInitials(name?: string | null) {
  if (!name) {
    return "??";
  }

  const segments = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (segments.length === 0) {
    return "??";
  }

  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase();
  }

  return segments
    .slice(0, 2)
    .map((segment) => segment[0])
    .join("")
    .toUpperCase();
}
