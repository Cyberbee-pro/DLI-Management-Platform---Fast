"use client";

import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CornerUpRight,
  ExternalLink,
  Loader2,
  ShieldCheck,
  User,
} from "lucide-react";

import { TaskMarkdown } from "./task-markdown";
import { TaskModalShell } from "./task-modal-shell";
import {
  formatTaskStatus,
  isTaskAssignedToUser,
  isTaskClaimed,
  resolveActorId,
  resolveActorName,
  resolveTaskOwnerName,
} from "./task-utils";
import type { TaskRecord, BusyAction } from "./types";

interface TaskDetailModalProps {
  open: boolean;
  task: TaskRecord | null;
  currentUserId: string | null;
  busyAction?: BusyAction;
  onClose: () => void;
  onClaim?: (task: TaskRecord) => void;
  onRequestTransfer?: (task: TaskRecord) => void;
  onAcceptTransfer?: (task: TaskRecord) => void;
  onWithdraw?: (task: TaskRecord) => void;
  onOpenSubmit?: (task: TaskRecord) => void;
}

function TagBadge({ label }: { label: string }) {
  return (
    <span className="rounded-sm border border-lime-400/20 bg-lime-400/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-lime-400">
      {label}
    </span>
  );
}

export function TaskDetailModal({
  open,
  task,
  currentUserId,
  busyAction = null,
  onClose,
  onClaim,
  onRequestTransfer,
  onAcceptTransfer,
  onWithdraw,
  onOpenSubmit,
}: TaskDetailModalProps): React.ReactNode {
  if (!task) {
    return null;
  }

  // Explicitly cast task as non-null for TypeScript type narrowing
  const safeTask = task as TaskRecord;
  
  const claimedByMe = isTaskAssignedToUser(safeTask, currentUserId);
  const transferToMe = resolveActorId(safeTask.transferRequest?.to ?? null) === currentUserId;
  const transferPending = safeTask.transferRequest?.status === "pending";
  const transferApproved =
    safeTask.transferRequest?.status === "approved" && safeTask.transferRequest.adminApproved;
  const transferTargetName = resolveActorName(safeTask.transferRequest?.to ?? null, "TARGET_NODE");
  const isClaimed = isTaskClaimed(safeTask);
  const hasSubmission = Boolean(safeTask.submissionDetails?.url);
  const submitDisabled = safeTask.status === "completed";
  const withdrawDisabled = safeTask.status !== "claimed";

  function renderPrimaryActions() {
    if (!isClaimed) {
      return (
        <button
          type="button"
          onClick={() => onClaim?.(safeTask)}
          disabled={busyAction === "claim" || !onClaim}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-lime-400 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === "claim" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busyAction === "claim" ? "CLAIMING..." : "CLAIM TASK"}
        </button>
      );
    }

    if (transferApproved && transferToMe && !claimedByMe) {
      return (
        <button
          type="button"
          onClick={() => onAcceptTransfer?.(safeTask)}
          disabled={busyAction === "accept-transfer" || !onAcceptTransfer}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-lime-400 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busyAction === "accept-transfer" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {busyAction === "accept-transfer" ? "ACCEPTING..." : "ACCEPT TRANSFER"}
        </button>
      );
    }

    if (claimedByMe) {
      return (
        <>
          <button
            type="button"
            onClick={() => onOpenSubmit?.(safeTask)}
            disabled={submitDisabled || !onOpenSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-lime-400 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowRight className="h-4 w-4" />
            {submitDisabled
              ? "DEPLOYMENT LOCKED"
              : hasSubmission
                ? "EDIT SUBMISSION"
                : "SUBMIT WORK"}
          </button>

          <button
            type="button"
            onClick={() => onWithdraw?.(safeTask)}
            disabled={withdrawDisabled || busyAction === "withdraw" || !onWithdraw}
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-neutral-300 transition hover:border-rose-400/30 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === "withdraw" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busyAction === "withdraw" ? "WITHDRAWING..." : "WITHDRAW"}
          </button>

          {safeTask.submissionDetails?.url ? (
            <a
              href={safeTask.submissionDetails.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-lime-400 transition hover:border-lime-400/30 hover:bg-lime-400/10"
            >
              <ExternalLink className="h-4 w-4" />
              VIEW_SUBMITTED_FILES
            </a>
          ) : null}
        </>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onRequestTransfer?.(safeTask)}
        disabled={transferPending || busyAction === "transfer" || !onRequestTransfer}
        className="inline-flex items-center justify-center gap-2 rounded-sm border border-lime-400/30 bg-black px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-lime-400 transition hover:bg-lime-400/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busyAction === "transfer" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busyAction === "transfer"
          ? "REQUESTING..."
          : transferPending
            ? "TRANSFER PENDING"
            : "REQUEST TRANSFER"}
      </button>
    );
  }

  return (
    <TaskModalShell
      open={open}
      onClose={onClose}
      title={safeTask.title}
      subtitle="Full mission context, transfer state, and submission controls."
    >
      <div className="space-y-6 px-5 py-5 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)]">
          <section className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm border border-neutral-800 bg-black px-2.5 py-1 font-mono text-xs uppercase tracking-[0.18em] text-neutral-400">
                {safeTask.category}
              </span>
              <span className="rounded-sm border border-neutral-800 bg-black px-2.5 py-1 font-mono text-xs uppercase tracking-[0.18em] text-lime-300">
                {formatTaskStatus(safeTask.status)}
              </span>
              {safeTask.tags.map((tag) => (
                <TagBadge key={tag} label={tag.replace(/[-_]/g, " ")} />
              ))}
            </div>

            <div className="rounded-sm border border-neutral-800 bg-black/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                Full Description
              </p>
              <div className="mt-4">
                <TaskMarkdown content={safeTask.description} />
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-sm border border-neutral-800 bg-black p-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                Points Available
              </p>
              <p className="mt-2 font-mono text-3xl font-semibold text-lime-400">
                {safeTask.points.effective.toLocaleString()}
              </p>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
                XP
              </p>
            </div>

            <div className="space-y-3 rounded-sm border border-neutral-800 bg-black/60 p-4 text-sm">
              <div className="flex items-center gap-3 text-neutral-300">
                <User className="h-4 w-4 text-lime-300" />
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                    Deployed By
                  </p>
                  <p className="mt-1 text-zinc-100">{safeTask.createdBy?.name ?? "SYSTEM_NODE"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-neutral-300">
                <CornerUpRight className="h-4 w-4 text-lime-300" />
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                    Assigned Node
                  </p>
                  <p className="mt-1 text-zinc-100">
                    {isClaimed ? resolveTaskOwnerName(task) : "UNCLAIMED"}
                  </p>
                </div>
              </div>

              {safeTask.repoUrl ? (
                <a
                  href={safeTask.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-sm border border-neutral-800 bg-neutral-900/40 px-3 py-3 text-neutral-300 transition hover:border-lime-400/30 hover:text-lime-300"
                >
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                      Repo Link
                    </p>
                    <p className="mt-1 text-sm text-zinc-100">Open linked repository</p>
                  </div>
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>

            {transferPending ? (
              <div className="rounded-sm border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="leading-6">
                    TRANSFER REQUESTED BY {transferTargetName.toUpperCase()} - AWAITING ADMIN
                    APPROVAL
                  </p>
                </div>
              </div>
            ) : null}

            {transferApproved && transferToMe && !claimedByMe ? (
              <div className="rounded-sm border border-lime-400/20 bg-lime-400/10 px-4 py-3 text-sm text-lime-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="leading-6">
                    ADMIN APPROVAL CONFIRMED. ACCEPT THIS TRANSFER TO TAKE OWNERSHIP OF THE TASK.
                  </p>
                </div>
              </div>
            ) : null}
          </aside>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-neutral-800 pt-5">
          {renderPrimaryActions()}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-neutral-400 transition hover:text-zinc-100"
          >
            CLOSE
          </button>
        </div>
      </div>
    </TaskModalShell>
  );
}
