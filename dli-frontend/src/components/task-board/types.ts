import type { TaskCategory } from "@/config/constants";

export type TaskStatus =
  | "open"
  | "claimed"
  | "in_review"
  | "completed"
  | "expired";

export type TaskDifficulty = "beginner" | "intermediate" | "advanced";

export interface TaskPoints {
  effective: number;
  base: number;
  multiplier: number;
}

export interface ClaimedBySnapshot {
  _id: string;
  name: string | null;
  srmRegNo: string | null;
  claimedAt: string | null;
}

export interface TaskRecord {
  _id: string;
  title: string;
  description: string;
  category: TaskCategory;
  points: TaskPoints;
  isHotBounty: boolean;
  status: TaskStatus;
  difficulty: TaskDifficulty;
  tags: string[];
  deadline?: string | null;
  claimedBy?: ClaimedBySnapshot | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TasksApiResponse {
  success: boolean;
  data: TaskRecord[];
  message?: string;
  code?: string;
}
