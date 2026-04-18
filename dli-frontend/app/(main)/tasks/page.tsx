"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  Loader2,
  SlidersHorizontal,
  Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import {
  OPERATOR_PROFILE,
  TASK_CATEGORIES,
  TASK_SORT_OPTIONS,
  type TaskCategory,
  type TaskSortOption,
} from "@/config/constants";
import { HotBountyCard } from "@/components/task-board/hot-bounty-card";
import { ProofOfWorkPanel } from "@/components/task-board/proof-of-work-panel";
import {
  acceptTransferRequest,
  claimTaskRequest,
  fetchTasksFromApi,
  parseSessionUser,
  taskKeys,
  updateSubmissionRequest,
  requestTransferRequest,
  submitTaskRequest,
  withdrawTaskRequest,
} from "@/components/task-board/task-api";
import { TaskDetailModal } from "@/components/task-board/task-detail-modal";
import { TaskQueue } from "@/components/task-board/task-queue";
import { TaskSubmissionModal } from "@/components/task-board/task-submission-modal";
import {
  isTaskAssignedToUser,
  isTransferApprovedForUser,
} from "@/components/task-board/task-utils";
import type { TaskRecord } from "@/components/task-board/types";
import { clearStoredToken, useSessionToken } from "@/lib/session";
import { dispatchShellProfileRefresh } from "@/lib/session-events";

const ALL_TASKS_FILTER = "All Tasks";
const TASK_FILTER_OPTIONS = [ALL_TASKS_FILTER, ...TASK_CATEGORIES] as const;

type BusyActionType =
  | "claim"
  | "transfer"
  | "accept-transfer"
  | "withdraw"
  | "submit";

interface BusyActionState {
  taskId: string;
  type: BusyActionType;
}

interface ActionNotice {
  tone: "success" | "error";
  message: string;
}

function sortTasks(tasks: TaskRecord[], sortBy: TaskSortOption) {
  const nextTasks = [...tasks];

  if (sortBy === "Highest Yield") {
    return nextTasks.sort((a, b) => b.points.effective - a.points.effective);
  }

  if (sortBy === "Nearest Deadline") {
    return nextTasks.sort((a, b) => {
      const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
      const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;

      return aDeadline - bDeadline;
    });
  }

  return nextTasks.sort((a, b) => {
    const aCreatedAt = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bCreatedAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    return bCreatedAt - aCreatedAt;
  });
}

export default function TaskBoardPage() {
  const router = useRouter();
  const { token, ready } = useSessionToken();
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<typeof ALL_TASKS_FILTER | TaskCategory>(ALL_TASKS_FILTER);
  const [sortBy, setSortBy] = useState<TaskSortOption>(TASK_SORT_OPTIONS[0]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [submissionTaskId, setSubmissionTaskId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyActionState | null>(null);

  const handleUnauthorized = useCallback(() => {
    clearStoredToken();
    router.replace("/login");
  }, [router]);

  const {
    data: tasksData,
    error: tasksError,
    isLoading: tasksLoading,
    mutate: mutateTasks,
  } = useSWR(
    token ? taskKeys.list(token) : null,
    ([, sessionToken]) =>
      fetchTasksFromApi({
        token: sessionToken,
        onUnauthorized: handleUnauthorized,
      }),
  );

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!token) {
      router.replace("/login");
    }
  }, [ready, router, token]);

  useEffect(() => {
    setSessionUserId(token ? parseSessionUser(token)?._id ?? null : null);
  }, [token]);

  const sessionUser = token ? parseSessionUser(token) : null;
  const isMemberView = sessionUser?.role === "member";

  useEffect(() => {
    if (!actionNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActionNotice(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [actionNotice]);

  const tasks = useMemo(() => tasksData ?? [], [tasksData]);
  const loading = !ready || (Boolean(token) && !tasksData && tasksLoading);
  const error = tasksError instanceof Error ? tasksError.message : null;

  const selectedTask = tasks.find((task) => task._id === selectedTaskId) ?? null;
  const submissionTask = tasks.find((task) => task._id === submissionTaskId) ?? null;
  const activeTasks = tasks.filter((task) => task.status !== "completed");
  const filteredTasks =
    selectedCategory === ALL_TASKS_FILTER
      ? activeTasks
      : activeTasks.filter((task) => task.category === selectedCategory);

  const hotBounties = useMemo(
    () => sortTasks(filteredTasks.filter((task) => task.isHotBounty), sortBy),
    [filteredTasks, sortBy],
  );
  const queuedTasks = useMemo(
    () => sortTasks(filteredTasks.filter((task) => !task.isHotBounty), sortBy),
    [filteredTasks, sortBy],
  );
  const myActionableTasks = useMemo(
    () =>
      sortTasks(
        tasks.filter(
          (task) =>
            ["claimed", "in_review"].includes(task.status) &&
            (isTaskAssignedToUser(task, sessionUserId) ||
              isTransferApprovedForUser(task, sessionUserId)),
        ),
        sortBy,
      ),
    [sessionUserId, sortBy, tasks],
  );

  const activeTaskCount = myActionableTasks.length;
  const hotTaskCount = hotBounties.filter((task) => task.status === "open").length;
  const claimedTaskCount = myActionableTasks.filter((task) =>
    isTaskAssignedToUser(task, sessionUserId),
  ).length;
  const liveYield = myActionableTasks.reduce((sum, task) => sum + task.points.effective, 0);

  async function runTaskAction({
    task,
    type,
    successMessage,
    action,
    closeSubmission = false,
  }: {
    task: TaskRecord;
    type: BusyActionType;
    successMessage: string;
    action: (token: string) => Promise<TaskRecord | null>;
    closeSubmission?: boolean;
  }) {
    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setBusyAction({ taskId: task._id, type });
      setActionNotice(null);

      const updatedTask = await action(token);

      if (updatedTask) {
        await mutateTasks(
          (currentTasks = []) =>
            currentTasks.map((currentTask) =>
            currentTask._id === updatedTask._id ? updatedTask : currentTask,
          ),
          {
            populateCache: true,
            revalidate: false,
          },
        );
      }

      await mutateTasks();

      if (closeSubmission) {
        setSubmissionTaskId(null);
      }

      if (type === "claim") {
        dispatchShellProfileRefresh();
      }

      setActionNotice({
        tone: "success",
        message: successMessage,
      });
    } catch (actionError) {
      setActionNotice({
        tone: "error",
        message:
          actionError instanceof Error
            ? actionError.message
            : "Task action failed. Please retry the uplink.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  function openTaskDetails(task: TaskRecord) {
    setSelectedTaskId(task._id);
  }

  function openSubmission(task: TaskRecord) {
    setSelectedTaskId(null);
    setSubmissionTaskId(task._id);
  }

  function handleClaimTask(task: TaskRecord) {
    void runTaskAction({
      task,
      type: "claim",
      successMessage: "TASK_ACQUIRED",
      action: (token) =>
        claimTaskRequest({
          taskId: task._id,
          token,
          onUnauthorized: handleUnauthorized,
        }),
    });
  }

  function handleRequestTransfer(task: TaskRecord) {
    void runTaskAction({
      task,
      type: "transfer",
      successMessage: "TRANSFER_SIGNAL_SENT",
      action: (token) =>
        requestTransferRequest({
          taskId: task._id,
          token,
          onUnauthorized: handleUnauthorized,
        }),
    });
  }

  function handleAcceptTransfer(task: TaskRecord) {
    void runTaskAction({
      task,
      type: "accept-transfer",
      successMessage: "TRANSFER_ACCEPTED",
      action: (token) =>
        acceptTransferRequest({
          taskId: task._id,
          token,
          onUnauthorized: handleUnauthorized,
        }),
    });
  }

  function handleWithdrawTask(task: TaskRecord) {
    void runTaskAction({
      task,
      type: "withdraw",
      successMessage: "TASK_RELEASED",
      action: (token) =>
        withdrawTaskRequest({
          taskId: task._id,
          token,
          onUnauthorized: handleUnauthorized,
        }),
    });
  }

  function handleSubmission(
    task: TaskRecord,
    draft: { fileUrl: string; comment: string; selectedFile: File | null },
  ) {
    if (!draft.fileUrl.trim()) {
      setActionNotice({
        tone: "error",
        message: "A hosted artifact URL is required before submission.",
      });
      return;
    }

    void runTaskAction({
      task,
      type: "submit",
      successMessage: task.submissionDetails?.url ? "SUBMISSION_UPDATED" : "SUCCESS",
      closeSubmission: true,
      action: (token) =>
        task.submissionDetails?.url
          ? updateSubmissionRequest({
              taskId: task._id,
              token,
              onUnauthorized: handleUnauthorized,
              fileUrl: draft.fileUrl.trim(),
              comment: draft.comment.trim(),
            })
          : submitTaskRequest({
              taskId: task._id,
              token,
              onUnauthorized: handleUnauthorized,
              fileUrl: draft.fileUrl.trim(),
              comment: draft.comment.trim(),
            }),
    });
  }

  const detailBusyAction =
    selectedTask && busyAction?.taskId === selectedTask._id
      ? busyAction.type === "submit"
        ? null
        : busyAction.type
      : null;
  const submissionBusy = Boolean(
    submissionTask && busyAction?.taskId === submissionTask._id && busyAction.type === "submit",
  );

  return (
    <>
      <div className="space-y-6 pb-4">
        <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
                Direct Liaison Interface / Active Node
              </p>
              <h1 className="mt-3 text-3xl font-semibold uppercase leading-tight tracking-tight text-zinc-50 sm:text-4xl">
                Task <span className="text-lime-400">Board</span>
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
                Tactical access to live bounties, queue depth, and submission pipelines for the{" "}
                {OPERATOR_PROFILE.handle.toLowerCase().replace("_", " ")} node.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-sm border border-neutral-800 bg-black px-4 py-4">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                  Hot Bounties
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold text-zinc-100">
                  {hotTaskCount.toString().padStart(2, "0")}
                </p>
              </div>
              <div className="rounded-sm border border-neutral-800 bg-black px-4 py-4">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                  Claimed Tasks
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold text-lime-400">
                  {claimedTaskCount.toString().padStart(2, "0")}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-neutral-800 pt-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-500">
                Filter By:
              </span>

              {TASK_FILTER_OPTIONS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedCategory(filter)}
                  className={[
                    "rounded-sm border px-3 py-2 font-mono text-xs uppercase tracking-[0.22em] transition",
                    selectedCategory === filter
                      ? "border-lime-400/35 bg-lime-400/10 text-lime-400"
                      : "border-neutral-800 bg-black text-neutral-400 hover:text-zinc-100",
                  ].join(" ")}
                >
                  {filter}
                </button>
              ))}
            </div>

            <label className="inline-flex items-center gap-3 rounded-sm border border-neutral-800 bg-black px-4 py-2.5 font-mono text-xs uppercase tracking-[0.22em] text-neutral-400">
              <SlidersHorizontal className="h-4 w-4 text-lime-400" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as TaskSortOption)}
                className="bg-transparent text-xs uppercase tracking-[0.22em] text-lime-400 outline-none"
              >
                {TASK_SORT_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-neutral-950 text-zinc-100">
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {error ? (
          <section className="rounded-sm border border-rose-950 bg-rose-950/20 px-4 py-4 text-sm text-rose-200">
            {error}
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Flame className="h-5 w-5 text-lime-400" />
            <h2 className="text-lg font-semibold uppercase tracking-[0.08em] text-zinc-50">
              Hot Bounties
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-lime-400/35 to-transparent" />
          </div>

          {loading ? (
            <div className="panel-surface flex items-center gap-3 rounded-sm border border-neutral-800 px-5 py-5 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin text-lime-400" />
              Syncing live hot bounty feed...
            </div>
          ) : hotBounties.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {hotBounties.map((task) => (
                <HotBountyCard
                  key={task._id}
                  task={task}
                  claiming={busyAction?.type === "claim" && busyAction.taskId === task._id}
                  onClaim={isMemberView ? handleClaimTask : undefined}
                  onInvestigate={openTaskDetails}
                  showClaimAction={isMemberView}
                />
              ))}
            </div>
          ) : (
            <div className="panel-surface rounded-sm border border-neutral-800 px-5 py-5 text-sm text-neutral-400">
              No hot bounties match the current filter.
            </div>
          )}
        </section>

        <TaskQueue tasks={queuedTasks} loading={loading} onInspect={openTaskDetails} />

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.83fr)]">
          <ProofOfWorkPanel
            claimedTasks={myActionableTasks}
            loading={loading}
            currentUserId={sessionUserId}
            allowActions={isMemberView}
            busyTaskId={busyAction?.type === "accept-transfer" ? busyAction.taskId : null}
            onViewTask={openTaskDetails}
            onOpenSubmit={openSubmission}
            onAcceptTransfer={isMemberView ? handleAcceptTransfer : undefined}
          />

          <article className="panel-surface rounded-sm border border-neutral-800 p-5">
            <div className="flex items-center gap-3">
              <Wifi className="h-5 w-5 text-lime-400" />
              <h2 className="text-lg font-semibold uppercase tracking-[0.08em] text-zinc-50">
                Node Status
              </h2>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-500">
                    Active Tasks
                  </p>
                  <p className="font-mono text-2xl font-semibold text-zinc-100">
                    {activeTaskCount.toString().padStart(2, "0")}
                  </p>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.3)]"
                    style={{
                      width: `${Math.min(100, Math.max(18, activeTaskCount * 18))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3 border-t border-neutral-800 pt-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-500">
                      Live Yield
                    </p>
                    <p className="mt-2 font-mono text-2xl font-semibold text-zinc-50">
                      {liveYield.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-500">
                      Claimed
                    </p>
                    <p className="mt-2 font-mono text-xl font-semibold text-lime-400">
                      {claimedTaskCount.toString().padStart(2, "0")}
                    </p>
                  </div>
                </div>

                <p className="text-sm leading-6 text-neutral-400">
                  {hotTaskCount} hot bounty node(s) currently open in the live feed. Investigate
                  any claimed mission to inspect its transfer state or submit work.
                </p>
              </div>
            </div>
          </article>
        </section>
      </div>

      {actionNotice ? (
        <section
          role="status"
          className={[
            "fixed bottom-4 right-4 z-[72] flex max-w-sm items-center gap-3 rounded-sm border px-4 py-4 text-sm shadow-[0_18px_60px_rgba(0,0,0,0.45)]",
            actionNotice.tone === "success"
              ? "border-lime-400/20 bg-neutral-950 text-lime-400"
              : "border-rose-400/20 bg-neutral-950 text-rose-200",
          ].join(" ")}
        >
          {actionNotice.tone === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span className="font-mono uppercase tracking-[0.18em]">{actionNotice.message}</span>
        </section>
      ) : null}

      <TaskDetailModal
        open={Boolean(selectedTask)}
        task={selectedTask}
        currentUserId={sessionUserId}
        allowActions={isMemberView}
        busyAction={detailBusyAction}
        onClose={() => setSelectedTaskId(null)}
        onClaim={isMemberView ? handleClaimTask : undefined}
        onRequestTransfer={isMemberView ? handleRequestTransfer : undefined}
        onAcceptTransfer={isMemberView ? handleAcceptTransfer : undefined}
        onWithdraw={isMemberView ? handleWithdrawTask : undefined}
        onOpenSubmit={isMemberView ? openSubmission : undefined}
      />

      <TaskSubmissionModal
        key={
          submissionTask
            ? `${submissionTask._id}-${submissionTask.submissionDetails?.submittedAt ?? "new"}`
            : "task-submission-closed"
        }
        open={Boolean(submissionTask)}
        task={submissionTask}
        submitting={submissionBusy}
        onClose={() => setSubmissionTaskId(null)}
        onSubmit={handleSubmission}
      />
    </>
  );
}
