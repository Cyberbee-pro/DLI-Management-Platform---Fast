import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookMarked,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldQuestion,
  Users,
} from "lucide-react";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const RANKS = [
  "Beginner",
  "Veteran",
  "Professional",
  "Elite",
  "Legendary",
] as const;

export const TASK_CATEGORIES = ["Frontend", "ML", "DevOps", "Content"] as const;

export const DIFFICULTIES = [
  "Beginner",
  "Intermediate",
  "Advanced",
] as const;

export const COURSE_CATEGORIES = [
  "Deep Learning",
  "Robotics",
  "HPC",
] as const;

export type Rank = (typeof RANKS)[number];
export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];
export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  accent?: "default" | "danger";
}

export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Task Board", href: "/tasks", icon: ClipboardList },
  { label: "User Registry", href: "/registry", icon: Users },
  { label: "System Analytics", href: "/analytics", icon: BarChart3 },
  { label: "DLI Catalogue", href: "/catalogue", icon: BookMarked },
] as const;

export const SECONDARY_NAV_ITEMS: readonly NavItem[] = [
  { label: "Settings", href: "/account", icon: Settings },
  { label: "Support", href: "/support", icon: ShieldQuestion },
  { label: "Logout", href: "/login", icon: LogOut, accent: "danger" },
] as const;

export const FOOTER_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
] as const;

export const OPERATOR_PROFILE = {
  handle: "ARCHITECT_ADMIN",
  clearance: "Level 4 Clearance",
  availableXp: "84,200",
  systemPoolBalance: "2.4M XP",
  avatarInitials: "AM",
} as const;

export const TASK_FILTERS = ["All Tasks", ...TASK_CATEGORIES] as const;

export const TASK_SORT_OPTIONS = [
  "Highest Yield",
  "Nearest Deadline",
  "Newest",
] as const;

export type TaskSortOption = (typeof TASK_SORT_OPTIONS)[number];
