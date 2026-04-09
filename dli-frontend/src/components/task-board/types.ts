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

export interface TaskActorReference {
  _id: string;
  name?: string | null;
  role?: "member" | "admin" | null;
  avatarUrl?: string | null;
  srmRegNo?: string | null;
}

export type TaskActor = TaskActorReference | string | null;

export interface TaskSubmissionRecord {
  fileUrl: string;
  timestamp: string;
  comment: string | null;
}

export interface TaskSubmissionDetails {
  url: string | null;
  comment: string | null;
  submittedAt: string | null;
}

export interface TaskTransferRequest {
  from?: TaskActor | null;
  to?: TaskActor | null;
  status?: "pending" | "approved" | "rejected" | null;
  adminApproved?: boolean;
  requestedAt?: string | null;
}

export interface TaskCreatorSnapshot {
  _id: string;
  name: string;
  srmRegNo: string;
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
  assignedTo?: TaskActor | null;
  createdBy?: TaskCreatorSnapshot | null;
  transferRequest?: TaskTransferRequest | null;
  submissions?: TaskSubmissionRecord[];
  submissionDetails?: TaskSubmissionDetails | null;
  repoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TasksApiResponse {
  success: boolean;
  data: TaskRecord[];
  message?: string;
  code?: string;
}

export type BusyAction =
  | "claim"
  | "transfer"
  | "accept-transfer"
  | "withdraw"
  | null;
