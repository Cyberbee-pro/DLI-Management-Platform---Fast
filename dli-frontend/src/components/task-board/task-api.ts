import { API_BASE_URL } from "@/config/constants";

import type { TaskRecord, TasksApiResponse } from "./types";

export interface TaskMutationResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: TaskRecord;
}

export interface CourseRequestMutationResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: unknown;
}

export interface SessionUser {
  _id: string;
  role?: "member" | "moderator" | "admin";
  srmRegNo?: string;
  name?: string;
}

export const taskKeys = {
  list: (token: string) => ["tasks", token] as const,
};

function sanitizeBaseUrl() {
  return API_BASE_URL.replace(/\/$/, "");
}

export function buildTasksEndpoint(): string {
  const sanitizedBaseUrl = sanitizeBaseUrl();
  return sanitizedBaseUrl ? `${sanitizedBaseUrl}/tasks` : "";
}

export function buildTaskActionEndpoint(taskId: string, suffix = ""): string {
  const tasksEndpoint = buildTasksEndpoint();
  return tasksEndpoint ? `${tasksEndpoint}/${taskId}${suffix}` : "";
}

function buildAdminRequestEndpoint(requestId: string): string {
  const sanitizedBaseUrl = sanitizeBaseUrl();
  return sanitizedBaseUrl ? `${sanitizedBaseUrl}/admin/requests/${requestId}` : "";
}

export function parseSessionUser(token: string): SessionUser | null {
  try {
    const [, payload] = token.split(".");

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "=",
    );
    const decodedPayload = JSON.parse(window.atob(paddedPayload));

    if (!decodedPayload?._id) {
      return null;
    }

    return {
      _id: decodedPayload._id,
      role: decodedPayload.role,
      srmRegNo: decodedPayload.srmRegNo,
      name: decodedPayload.name,
    };
  } catch {
    return null;
  }
}

export async function fetchTasksFromApi({
  token,
  signal,
  onUnauthorized,
}: {
  token: string;
  signal?: AbortSignal;
  onUnauthorized?: () => void;
}) {
  const taskEndpoint = buildTasksEndpoint();

  if (!taskEndpoint) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured, so the live task feed cannot load.");
  }

  const response = await fetch(taskEndpoint, {
    method: "GET",
    cache: "no-store",
    signal,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as TasksApiResponse | null;

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized?.();
      return [];
    }

    throw new Error(payload?.message ?? `Failed to load tasks (${response.status}).`);
  }

  return Array.isArray(payload?.data) ? payload.data : [];
}

async function performTaskMutation({
  taskId,
  suffix,
  token,
  onUnauthorized,
  method = "POST",
  body,
}: {
  taskId: string;
  suffix: string;
  token: string;
  onUnauthorized: () => void;
  method?: "POST" | "PATCH";
  body?: Record<string, unknown>;
}) {
  const endpoint = buildTaskActionEndpoint(taskId, suffix);

  if (!endpoint) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  const response = await fetch(endpoint, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as TaskMutationResponse | null;

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized();
      return null;
    }

    throw new Error(payload?.message ?? `Task action failed (${response.status}).`);
  }

  return payload?.data ?? null;
}

export function claimTaskRequest(args: {
  taskId: string;
  token: string;
  onUnauthorized: () => void;
}) {
  return performTaskMutation({
    ...args,
    suffix: "/claim",
  });
}

export function submitTaskRequest(args: {
  taskId: string;
  token: string;
  onUnauthorized: () => void;
  fileUrl: string;
  comment?: string;
}) {
  return performTaskMutation({
    taskId: args.taskId,
    token: args.token,
    onUnauthorized: args.onUnauthorized,
    suffix: "/submit",
    body: {
      fileUrl: args.fileUrl,
      comment: args.comment ?? "",
    },
  });
}

export function updateSubmissionRequest(args: {
  taskId: string;
  token: string;
  onUnauthorized: () => void;
  fileUrl: string;
  comment?: string;
}) {
  return performTaskMutation({
    taskId: args.taskId,
    token: args.token,
    onUnauthorized: args.onUnauthorized,
    suffix: "/submission",
    method: "PATCH",
    body: {
      fileUrl: args.fileUrl,
      comment: args.comment ?? "",
    },
  });
}

export function requestTransferRequest(args: {
  taskId: string;
  token: string;
  onUnauthorized: () => void;
  toUserId?: string;
}) {
  return performTaskMutation({
    taskId: args.taskId,
    token: args.token,
    onUnauthorized: args.onUnauthorized,
    suffix: "/transfer/request",
    body: args.toUserId ? { toUserId: args.toUserId } : undefined,
  });
}

export function acceptTransferRequest(args: {
  taskId: string;
  token: string;
  onUnauthorized: () => void;
}) {
  return performTaskMutation({
    ...args,
    suffix: "/transfer/accept",
  });
}

export function withdrawTaskRequest(args: {
  taskId: string;
  token: string;
  onUnauthorized: () => void;
}) {
  return performTaskMutation({
    ...args,
    suffix: "/withdraw",
  });
}

export function approveTaskSubmissionRequest(args: {
  taskId: string;
  token: string;
  onUnauthorized: () => void;
}) {
  return performTaskMutation({
    ...args,
    suffix: "/submission/approve",
    method: "PATCH",
  });
}

export function rejectTaskSubmissionRequest(args: {
  taskId: string;
  token: string;
  onUnauthorized: () => void;
  reason?: string;
}) {
  return performTaskMutation({
    taskId: args.taskId,
    token: args.token,
    onUnauthorized: args.onUnauthorized,
    suffix: "/submission/reject",
    method: "PATCH",
    body: args.reason ? { reason: args.reason } : undefined,
  });
}

export async function approveCourseRequestRequest({
  requestId,
  token,
  onUnauthorized,
  adminNote,
}: {
  requestId: string;
  token: string;
  onUnauthorized: () => void;
  adminNote?: string;
}) {
  const endpoint = buildAdminRequestEndpoint(requestId);

  if (!endpoint) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: "approved",
      adminNote: adminNote ?? "",
    }),
  });

  const payload =
    (await response.json().catch(() => null)) as CourseRequestMutationResponse | null;

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized();
      return null;
    }

    throw new Error(payload?.message ?? `Course approval failed (${response.status}).`);
  }

  return payload?.data ?? null;
}
