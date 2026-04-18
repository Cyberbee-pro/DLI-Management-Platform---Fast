"use client";

import { ArrowRight, ExternalLink, FileUp, Loader2, ShieldCheck } from "lucide-react";

import {
  formatTaskStatus,
  isTaskAssignedToUser,
  isTransferApprovedForUser,
  resolveActorName,
} from "./task-utils";
import type { TaskRecord } from "./types";

interface ProofOfWorkPanelProps {
  claimedTasks: TaskRecord[];
  loading: boolean;
  currentUserId: string | null;
  allowActions?: boolean;
  busyTaskId?: string | null;
  onViewTask: (task: TaskRecord) => void;
  onOpenSubmit: (task: TaskRecord) => void;
  onAcceptTransfer?: (task: TaskRecord) => void;
}

export function ProofOfWorkPanel({
  claimedTasks,
  loading,
  currentUserId,
  allowActions = true,
  busyTaskId = null,
  onViewTask,
  onOpenSubmit,
  onAcceptTransfer,
}: ProofOfWorkPanelProps) {
  return (
    <article className="panel-surface rounded-sm border border-neutral-800 p-5">
      <div className="flex items-center gap-3">
        <FileUp className="h-4 w-4 text-lime-300" />
        <h2 className="text-lg font-semibold uppercase tracking-[0.08em] text-zinc-50">
          Active Submission Stack
        </h2>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="rounded-sm border border-neutral-800 bg-black/30 px-4 py-4 text-sm text-neutral-500">
            Syncing assigned-task channel...
          </div>
        ) : claimedTasks.length === 0 ? (
          <div className="rounded-sm border border-neutral-800 bg-black/30 px-4 py-4 text-sm text-neutral-500">
            No active tasks are routed to this node yet.
          </div>
        ) : (
          claimedTasks.map((task) => {
            const transferPending = task.transferRequest?.status === "pending";
            const transferApproved = isTransferApprovedForUser(task, currentUserId);
            const ownedByCurrentUser = isTaskAssignedToUser(task, currentUserId);
            const transferRequester = resolveActorName(
              task.transferRequest?.to ?? null,
              "REQUESTING_NODE",
            );
            const hasSubmission = Boolean(task.submissionDetails?.url);

            return (
              <div
                key={task._id}
                className="rounded-sm border border-neutral-800 bg-black/40 px-4 py-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                      {formatTaskStatus(task.status)}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-zinc-100">{task.title}</h3>
                    <p className="mt-2 font-mono text-sm text-lime-400">
                      {task.points.effective.toLocaleString()} XP
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => onViewTask(task)}
                      className="inline-flex items-center justify-center gap-2 rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-neutral-300 transition hover:border-lime-400/30 hover:text-lime-400"
                    >
                      VIEW DETAILS
                    </button>

                    {allowActions && ownedByCurrentUser ? (
                      <>
                        <button
                          type="button"
                          disabled={task.status === "completed"}
                          onClick={() => onOpenSubmit(task)}
                          className="inline-flex items-center justify-center gap-2 rounded-sm bg-lime-400 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ArrowRight className="h-4 w-4" />
                          {hasSubmission ? "EDIT SUBMISSION" : task.status === "claimed" ? "SUBMIT TASK" : "UNDER REVIEW"}
                        </button>

                        {task.submissionDetails?.url ? (
                          <a
                            href={task.submissionDetails.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-lime-400 transition hover:border-lime-400/30 hover:bg-lime-400/10"
                          >
                            <ExternalLink className="h-4 w-4" />
                            VIEW_SUBMITTED_FILES
                          </a>
                        ) : null}
                      </>
                    ) : null}

                    {allowActions && transferApproved && !ownedByCurrentUser ? (
                      <button
                        type="button"
                        onClick={() => onAcceptTransfer?.(task)}
                        disabled={busyTaskId === task._id || !onAcceptTransfer}
                        className="inline-flex items-center justify-center gap-2 rounded-sm bg-lime-400 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyTaskId === task._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        {busyTaskId === task._id ? "ACCEPTING..." : "ACCEPT TRANSFER"}
                      </button>
                    ) : null}
                  </div>
                </div>

                {transferPending && ownedByCurrentUser ? (
                  <div className="mt-4 rounded-sm border border-amber-400/20 bg-amber-400/10 px-3 py-3 text-sm text-amber-200">
                    TRANSFER REQUESTED BY {transferRequester.toUpperCase()} - AWAITING ADMIN
                    APPROVAL
                  </div>
                ) : null}

                {transferApproved && !ownedByCurrentUser ? (
                  <div className="mt-4 rounded-sm border border-lime-400/20 bg-lime-400/10 px-3 py-3 text-sm text-lime-200">
                    TRANSFER APPROVED FOR THIS NODE. ACCEPT TO CLAIM OWNERSHIP.
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
