"use client";

import {
  ExternalLink,
  Loader2,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";

import { TaskModalShell } from "./task-modal-shell";
import { resolveTaskOwnerName } from "./task-utils";
import type { TaskRecord } from "./types";

interface TaskApprovalModalProps {
  open: boolean;
  task: TaskRecord | null;
  approving?: boolean;
  rejecting?: boolean;
  onClose: () => void;
  onApprove: (task: TaskRecord) => void;
  onReject: (task: TaskRecord) => void;
}

export function TaskApprovalModal({
  open,
  task,
  approving = false,
  rejecting = false,
  onClose,
  onApprove,
  onReject,
}: TaskApprovalModalProps) {
  if (!task) {
    return null;
  }

  const submittedUrl = task.submissionDetails?.url ?? task.submissions?.at(-1)?.fileUrl ?? null;
  const submittedComment =
    task.submissionDetails?.comment ?? task.submissions?.at(-1)?.comment ?? null;

  return (
    <TaskModalShell
      open={open}
      onClose={onClose}
      title={`Evidence Review: ${task.title}`}
      subtitle="Verify the latest deployment evidence before approving or rejecting the submission."
    >
      <div className="space-y-6 px-5 py-5 sm:px-6">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="space-y-4">
            <div className="rounded-sm border border-neutral-800 bg-black/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                Submitted Description
              </p>
              <p className="mt-3 text-sm leading-7 text-neutral-300">
                {submittedComment?.trim() || "No operator comment was attached to this submission."}
              </p>
            </div>

            {submittedUrl ? (
              <div className="rounded-sm border border-neutral-800 bg-black/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                      Uploaded Work
                    </p>
                    <p className="mt-2 break-all text-sm text-zinc-100">{submittedUrl}</p>
                  </div>
                  <a
                    href={submittedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-neutral-800 bg-black text-lime-400 transition hover:border-lime-400/30"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                <div className="mt-4 overflow-hidden rounded-sm border border-neutral-800 bg-black">
                  <iframe
                    title={`${task.title} evidence preview`}
                    src={submittedUrl}
                    className="h-72 w-full bg-black"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-sm border border-neutral-800 bg-black p-4">
              <div className="flex items-center gap-3 text-neutral-300">
                <User className="h-4 w-4 text-lime-300" />
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                    Submitted By
                  </p>
                  <p className="mt-1 text-sm text-zinc-100">{resolveTaskOwnerName(task)}</p>
                </div>
              </div>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
                {task.points.effective.toLocaleString()} XP
              </p>
            </div>

            <div className="rounded-sm border border-neutral-800 bg-black/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                Submission State
              </p>
              <p className="mt-2 text-sm text-zinc-100">Awaiting creator/admin verification.</p>
            </div>
          </aside>
        </section>

        <div className="flex flex-wrap gap-3 border-t border-neutral-800 pt-5">
          <button
            type="button"
            onClick={() => onApprove(task)}
            disabled={approving}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-lime-400 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {approving ? "APPROVING..." : "APPROVE_DEPLOYMENT"}
          </button>

          <button
            type="button"
            onClick={() => onReject(task)}
            disabled={rejecting}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-rose-500 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            {rejecting ? "REJECTING..." : "REJECT"}
          </button>

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
