import type { TaskActor, TaskRecord, TaskStatus } from "./types";

function isActorReference(actor: TaskActor): actor is Exclude<TaskActor, string | null> {
  return Boolean(actor && typeof actor === "object" && "_id" in actor);
}

export function resolveActorId(actor: TaskActor): string | null {
  if (!actor) {
    return null;
  }

  if (typeof actor === "string") {
    return actor;
  }

  return actor._id ?? null;
}

export function resolveActorName(actor: TaskActor, fallback = "UNASSIGNED_NODE"): string {
  if (!actor) {
    return fallback;
  }

  if (typeof actor === "string") {
    return fallback;
  }

  return actor.name ?? fallback;
}

export function resolveTaskOwnerId(task: TaskRecord): string | null {
  return resolveActorId(task.assignedTo) ?? task.claimedBy?._id ?? null;
}

export function resolveTaskOwnerName(task: TaskRecord): string {
  if (isActorReference(task.assignedTo)) {
    return task.assignedTo.name ?? "UNASSIGNED_NODE";
  }

  return task.claimedBy?.name ?? "UNASSIGNED_NODE";
}

export function isTaskClaimed(task: TaskRecord): boolean {
  return Boolean(resolveTaskOwnerId(task));
}

export function isTaskAssignedToUser(task: TaskRecord, userId: string | null): boolean {
  if (!userId) {
    return false;
  }

  return resolveTaskOwnerId(task) === userId;
}

export function isTransferApprovedForUser(task: TaskRecord, userId: string | null): boolean {
  if (!userId || !task.transferRequest?.adminApproved) {
    return false;
  }

  return resolveActorId(task.transferRequest.to ?? null) === userId;
}

export function formatTaskStatus(status: TaskStatus): string {
  return status.replace(/_/g, " ").toUpperCase();
}

export function formatTaskId(taskId: string): string {
  return taskId.slice(-8).toUpperCase();
}

export function getTaskTag(task: TaskRecord): string {
  return task.tags[0]?.replace(/[-_]/g, " ") ?? task.category;
}
