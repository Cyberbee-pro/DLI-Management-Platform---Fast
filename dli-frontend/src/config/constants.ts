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

export interface HotBounty {
  id: string;
  emphasis: string;
  category: TaskCategory;
  multiplier: string;
  title: string;
  description: string;
  reward: number;
  difficulty: Difficulty;
  timeRemaining: string;
}

export interface TaskQueueItem {
  id: string;
  title: string;
  category: TaskCategory;
  difficulty: Difficulty;
  reward: number;
  node: string;
}

export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Task Board", href: "/tasks", icon: ClipboardList },
  { label: "User Registry", href: "/registry", icon: Users },
  { label: "System Analytics", href: "/analytics", icon: BarChart3 },
  { label: "DLI Catalogue", href: "/catalogue", icon: BookMarked },
] as const;

export const SECONDARY_NAV_ITEMS: readonly NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Support", href: "/support", icon: ShieldQuestion },
  { label: "Logout", href: "/logout", icon: LogOut, accent: "danger" },
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

export const HOT_BOUNTIES: readonly HotBounty[] = [
  {
    id: "NB-001",
    emphasis: "Critical Path",
    category: "ML",
    multiplier: "2.0x Multiplier",
    title: "Neural Network Bypass: Vulnerability Audit",
    description:
      "Identify and document potential leaks inside the core orchestration layer before the next deployment cycle.",
    reward: 4500,
    difficulty: "Advanced",
    timeRemaining: "04:22:18:09",
  },
  {
    id: "DL-014",
    emphasis: "Architecture",
    category: "DevOps",
    multiplier: "1.5x Multiplier",
    title: "Redesign: Distributed Ledger Consensus",
    description:
      "Propose a lower-latency validation path for the internal DLI registry and reduce operational drift.",
    reward: 2250,
    difficulty: "Intermediate",
    timeRemaining: "12:15:44:00",
  },
] as const;

export const TASK_QUEUE_ITEMS: readonly TaskQueueItem[] = [
  {
    id: "T-482-B",
    title: "Optimize Database Sharding Strategy",
    category: "DevOps",
    difficulty: "Intermediate",
    reward: 850,
    node: "Infrastructure",
  },
  {
    id: "T-291-C",
    title: "Draft Whitepaper: Zero Knowledge API",
    category: "Content",
    difficulty: "Advanced",
    reward: 1400,
    node: "Research",
  },
  {
    id: "T-105-X",
    title: "Refactor CLI Command Parsers",
    category: "Frontend",
    difficulty: "Beginner",
    reward: 450,
    node: "Tooling",
  },
] as const;

export const TASK_BOARD_SUMMARY = {
  activeTaskId: "NEURAL-NET-BYPASS-001",
  activeBounties: 3,
  accruedDli: "12,480",
  currentRank: "Elite" as Rank,
  distanceToNextRank: "1,520 DLI away from Legendary status.",
  nodeUptime: "99.9992%",
  networkLatency: "12ms (Optimal)",
  protocol: "F.A.S.T. v4.2",
} as const;
