"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { API_BASE_URL } from "@/config/constants";
import {
  acceptTransferRequest,
  approveCourseRequestRequest,
  approveTaskSubmissionRequest,
  rejectTaskSubmissionRequest,
  submitTaskRequest,
  updateSubmissionRequest,
  withdrawTaskRequest,
} from "@/components/task-board/task-api";
import { TaskApprovalModal } from "@/components/task-board/task-approval-modal";
import { TaskDetailModal } from "@/components/task-board/task-detail-modal";
import { TaskSubmissionModal } from "@/components/task-board/task-submission-modal";
import {
  isTaskAssignedToUser,
  isTransferApprovedForUser,
  resolveActorName,
} from "@/components/task-board/task-utils";
import type { TaskRecord } from "@/components/task-board/types";

interface DashboardUser {
  _id: string;
  name: string;
  email: string;
  srmRegNo: string;
  role: "member" | "admin";
  rank: string;
  coursesCompletedCount: number;
  lastLoginAt?: string | null;
  notificationPrefs?: {
    email: boolean;
  };
  points: {
    balance: string;
    totalEarned: string;
    totalSpent: string;
    negativeAccrued: string;
  };
  activeCourse?: {
    _id?: string | null;
    title?: string | null;
    pointsRequired?: string | null;
  } | null;
}

interface CourseRequestRecord {
  _id: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  processedAt?: string | null;
  redemptionCode?: string | null;
  adminNote?: string | null;
  requestedBy: {
    _id: string;
    name: string;
    email?: string;
    srmRegNo?: string;
  };
  course: {
    _id: string;
    title: string;
    pointsRequired: string;
  };
}

interface CourseRequestStandingEvent {
  action: string;
  pointsDelta: number;
  timestamp: string;
}

interface CourseRequestStanding {
  recentXpGain: number;
  recentActivityCount: number;
  recentPointEvents: CourseRequestStandingEvent[];
}

interface GovernanceCourseRequestRecord extends CourseRequestRecord {
  standing: CourseRequestStanding;
}

interface DashboardGovernance {
  canReviewTasks: boolean;
  canReviewCourses: boolean;
  pendingTaskApprovals: TaskRecord[];
  pendingCourseApprovals: GovernanceCourseRequestRecord[];
}

interface DashboardPayload {
  user: DashboardUser;
  courseRequests: CourseRequestRecord[];
  activeTasks: TaskRecord[];
  claimedTasks?: TaskRecord[];
  governance?: DashboardGovernance;
}

interface DashboardApiResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: DashboardPayload;
}

type BusyActionType =
  | "submit"
  | "accept-transfer"
  | "withdraw"
  | "approve-task"
  | "reject-task";

interface BusyActionState {
  taskId: string;
  type: BusyActionType;
}

interface ActionNotice {
  tone: "success" | "error";
  message: string;
}

function buildDashboardEndpoint() {
  const sanitizedBaseUrl = API_BASE_URL.replace(/\/$/, "");
  return sanitizedBaseUrl ? `${sanitizedBaseUrl}/dashboard/me` : "";
}

function parseMetric(value: string | number | null | undefined) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value ?? "0");

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatMetric(value: string | number | null | undefined) {
  return parseMetric(value).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toUpperCase();
}

function statusClasses(status: CourseRequestRecord["status"]) {
  if (status === "approved") {
    return "border-lime-400/20 bg-lime-400/10 text-lime-300";
  }

  if (status === "rejected") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}

export default function DashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [busyAction, setBusyAction] = useState<BusyActionState | null>(null);
  const [busyCourseRequestId, setBusyCourseRequestId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [submissionTaskId, setSubmissionTaskId] = useState<string | null>(null);
  const [approvalTaskId, setApprovalTaskId] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    window.localStorage.removeItem("token");
    router.push("/login");
  }, [router]);

  const refreshDashboard = useCallback(
    async (token: string, signal?: AbortSignal) => {
      const dashboardEndpoint = buildDashboardEndpoint();

      if (!dashboardEndpoint) {
        throw new Error("NEXT_PUBLIC_API_URL is not configured.");
      }

      const response = await fetch(dashboardEndpoint, {
        method: "GET",
        cache: "no-store",
        signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as DashboardApiResponse | null;

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        throw new Error(payload?.message ?? `Failed to load dashboard (${response.status}).`);
      }

      if (!payload?.data) {
        throw new Error("Dashboard response is missing required data.");
      }

      setDashboard(payload.data);
    },
    [handleUnauthorized],
  );

useEffect(() => {
    // 1. Get the raw value
    const rawToken = window.localStorage.getItem("token");
    const controller = new AbortController();

    // 2. Guard clause: if null, redirect and stop
    if (!rawToken) {
      router.push("/login");
      return () => controller.abort();
    }

    // 3. Explicitly tell TS: "This is definitely a string now"
    const token: string = rawToken;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        // Pass the guaranteed string token
        await refreshDashboard(token, controller.signal);
      } catch (dashboardError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          dashboardError instanceof Error
            ? dashboardError.message
            : "An unexpected dashboard error occurred.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => controller.abort();
  }, [refreshDashboard, router]);

  useEffect(() => {
    if (!actionNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActionNotice(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [actionNotice]);

  const activeTasks = dashboard ? dashboard.claimedTasks ?? dashboard.activeTasks : [];
  const governance = dashboard?.governance;
  const pendingTaskApprovals = governance?.pendingTaskApprovals ?? [];
  const pendingCourseApprovals = governance?.pendingCourseApprovals ?? [];
  const selectedTask = activeTasks.find((task) => task._id === selectedTaskId) ?? null;
  const submissionTask = activeTasks.find((task) => task._id === submissionTaskId) ?? null;
  const approvalTask =
    pendingTaskApprovals.find((task) => task._id === approvalTaskId) ?? null;

  async function runTaskAction({
    task,
    type,
    successMessage,
    action,
    closeSubmission = false,
    closeApproval = false,
  }: {
    task: TaskRecord;
    type: BusyActionType;
    successMessage: string;
    action: (token: string) => Promise<TaskRecord | null>;
    closeSubmission?: boolean;
    closeApproval?: boolean;
  }) {
    const token = window.localStorage.getItem("token");

    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setBusyAction({ taskId: task._id, type });
      setActionNotice(null);

      await action(token);
      await refreshDashboard(token);

      if (closeSubmission) {
        setSubmissionTaskId(null);
      }

      if (closeApproval) {
        setApprovalTaskId(null);
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
            : "Dashboard task action failed.",
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

  function openApprovalEvidence(task: TaskRecord) {
    setApprovalTaskId(task._id);
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

  function handleApproveTaskSubmission(task: TaskRecord) {
    void runTaskAction({
      task,
      type: "approve-task",
      successMessage: "DEPLOYMENT_APPROVED",
      closeApproval: true,
      action: (token) =>
        approveTaskSubmissionRequest({
          taskId: task._id,
          token,
          onUnauthorized: handleUnauthorized,
        }),
    });
  }

  function handleRejectTaskSubmission(task: TaskRecord) {
    void runTaskAction({
      task,
      type: "reject-task",
      successMessage: "DEPLOYMENT_REJECTED",
      closeApproval: true,
      action: (token) =>
        rejectTaskSubmissionRequest({
          taskId: task._id,
          token,
          onUnauthorized: handleUnauthorized,
        }),
    });
  }

  async function handleApproveCourseRequest(requestId: string) {
    const token = window.localStorage.getItem("token");

    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setBusyCourseRequestId(requestId);
      setActionNotice(null);
      await approveCourseRequestRequest({
        requestId,
        token,
        onUnauthorized: handleUnauthorized,
      });
      await refreshDashboard(token);
      setActionNotice({
        tone: "success",
        message: "ACCESS_APPROVED",
      });
    } catch (approvalError) {
      setActionNotice({
        tone: "error",
        message:
          approvalError instanceof Error
            ? approvalError.message
            : "Course approval failed.",
      });
    } finally {
      setBusyCourseRequestId(null);
    }
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

  if (loading) {
    return (
      <div className="panel-surface flex items-center gap-3 rounded-sm border border-neutral-800 px-5 py-5 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin text-lime-300" />
        <span className="font-mono uppercase tracking-[0.2em]">Syncing dashboard node...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-sm border border-rose-950 bg-rose-950/20 px-5 py-5 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="rounded-sm border border-neutral-800 bg-neutral-900/70 px-5 py-5 text-sm text-zinc-400">
        Dashboard data is unavailable.
      </div>
    );
  }

  const { user, courseRequests } = dashboard;
  const pointsBalance = parseMetric(user.points.balance);
  const totalEarned = parseMetric(user.points.totalEarned);
  const totalSpent = parseMetric(user.points.totalSpent);
  const latestCourseRequest = courseRequests[0] ?? null;
  const activeCourseTitle =
    user.activeCourse?.title ?? latestCourseRequest?.course.title ?? "No Active Course";
  const activeCourseCost =
    user.activeCourse?.pointsRequired ?? latestCourseRequest?.course.pointsRequired ?? "0";
  const activityDenominator = Math.max(activeTasks.length + courseRequests.length, 1);
  const operationalLoad = Math.min(
    100,
    Math.round((activeTasks.length / activityDenominator) * 100) || 0,
  );
  const analyticsMetrics = [
    { label: "Balance", value: pointsBalance, accent: true },
    { label: "Total Earned", value: totalEarned, accent: false },
    { label: "Total Spent", value: totalSpent, accent: false },
  ];
  const maxMetric = Math.max(...analyticsMetrics.map((metric) => metric.value), 1);
  const governanceVisible = Boolean(
    governance?.canReviewTasks || governance?.canReviewCourses,
  );
  const detailBusyAction =
    selectedTask && busyAction?.taskId === selectedTask._id
      ? busyAction.type === "submit" ||
        busyAction.type === "accept-transfer" ||
        busyAction.type === "withdraw"
        ? busyAction.type
        : null
      : null;
  const submissionBusy = Boolean(
    submissionTask && busyAction?.taskId === submissionTask._id && busyAction.type === "submit",
  );
  const approvalBusyAction =
    approvalTask && busyAction?.taskId === approvalTask._id ? busyAction.type : null;

  return (
    <>
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(300px,0.95fr)]">
          <article className="panel-surface rounded-sm border border-neutral-800 px-5 py-6 sm:px-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
              Current Status
            </p>

            <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h1 className="text-xl font-semibold uppercase tracking-tight text-zinc-50">
                  {user.rank} Rank
                </h1>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {user.name} / {user.srmRegNo} / {user.role.toUpperCase()}
                </p>
              </div>

              <div className="text-left xl:text-right">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
                  Total Points
                </p>
                <p className="mt-2 font-mono text-3xl font-semibold text-zinc-50">
                  {formatMetric(user.points.balance)}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
                  Operational Load
                </p>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
                  {operationalLoad}%
                </p>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.25)]"
                  style={{ width: `${Math.max(10, operationalLoad)}%` }}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Derived from the current active-task load and redemption activity on this node.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-sm border border-neutral-800 bg-black px-4 py-4">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">
                  Active Tasks
                </p>
                <p className="mt-2 font-mono text-xl font-semibold text-zinc-100">
                  {activeTasks.length.toString().padStart(2, "0")}
                </p>
              </div>

              <div className="rounded-sm border border-neutral-800 bg-black px-4 py-4">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">
                  Courses Completed
                </p>
                <p className="mt-2 font-mono text-xl font-semibold text-zinc-100">
                  {user.coursesCompletedCount.toString().padStart(2, "0")}
                </p>
              </div>

              <div className="rounded-sm border border-neutral-800 bg-black px-4 py-4">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">
                  Last Login
                </p>
                <p className="mt-2 font-mono text-sm text-zinc-200">
                  {formatTimestamp(user.lastLoginAt)}
                </p>
              </div>
            </div>
          </article>

          <div className="grid gap-6">
            <article className="panel-surface rounded-sm border border-neutral-800 px-5 py-5">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-lime-300" />
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-400">
                  Node Health
                </p>
              </div>

              <div className="mt-5 space-y-4 text-sm text-zinc-300">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                  <span className="text-zinc-500">Email Alerts</span>
                  <span className="font-mono text-lime-300">
                    {user.notificationPrefs?.email ? "ENABLED" : "DISABLED"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                  <span className="text-zinc-500">Request Queue</span>
                  <span className="font-mono text-zinc-100">{courseRequests.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Pending Modules</span>
                  <span className="font-mono text-zinc-100">
                    {courseRequests.filter((request) => request.status === "pending").length}
                  </span>
                </div>
              </div>
            </article>

            <article className="panel-surface rounded-sm border border-neutral-800 px-5 py-5">
              <div className="flex items-center gap-3">
                <Clock3 className="h-4 w-4 text-lime-300" />
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-400">
                  Recent Task Activity
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {activeTasks.length > 0 ? (
                  activeTasks.slice(0, 3).map((task) => {
                    const ownedByCurrentUser = isTaskAssignedToUser(task, user._id);
                    const transferPending = task.transferRequest?.status === "pending";
                    const transferApproved = isTransferApprovedForUser(task, user._id);
                    const transferRequester = resolveActorName(
                      task.transferRequest?.to ?? null,
                      "REQUESTING_NODE",
                    );

                    return (
                      <div
                        key={task._id}
                        className="rounded-sm border border-neutral-800 bg-neutral-950 px-4 py-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-zinc-100">{task.title}</p>
                            <div className="mt-2 flex items-center gap-4 text-xs">
                              <span className="font-mono uppercase tracking-[0.18em] text-zinc-500">
                                {formatStatus(task.status)}
                              </span>
                              <span className="font-mono text-lime-300">
                                {task.points.effective.toLocaleString()} XP
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openTaskDetails(task)}
                              className="rounded-sm border border-neutral-800 bg-black px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-300 transition hover:border-lime-400/30 hover:text-lime-400"
                            >
                              VIEW DETAILS
                            </button>

                            <button
                              type="button"
                              disabled={!ownedByCurrentUser || task.status === "completed"}
                              onClick={() => openSubmission(task)}
                              className="rounded-sm bg-lime-400 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {ownedByCurrentUser
                                ? task.submissionDetails?.url
                                  ? "EDIT_SUBMISSION"
                                  : task.status === "claimed"
                                    ? "SUBMIT TASK"
                                    : "UNDER REVIEW"
                                : "UNDER REVIEW"}
                            </button>

                            {transferApproved && !ownedByCurrentUser ? (
                              <button
                                type="button"
                                onClick={() => handleAcceptTransfer(task)}
                                disabled={
                                  busyAction?.type === "accept-transfer" &&
                                  busyAction.taskId === task._id
                                }
                                className="inline-flex items-center gap-2 rounded-sm bg-lime-400 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {busyAction?.type === "accept-transfer" &&
                                busyAction.taskId === task._id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                )}
                                ACCEPT TRANSFER
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {transferPending && ownedByCurrentUser ? (
                          <div className="mt-4 rounded-sm border border-amber-400/20 bg-amber-400/10 px-3 py-3 text-sm text-amber-200">
                            TRANSFER REQUESTED BY {transferRequester.toUpperCase()} - AWAITING
                            ADMIN APPROVAL
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-zinc-500">
                    No active tasks are currently attached to this account.
                  </p>
                )}
              </div>
            </article>
          </div>
        </section>

        {governanceVisible ? (
          <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6 sm:px-6">
            <div className="flex flex-col gap-3 border-b border-neutral-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
                  PENDING_APPROVALS
                </p>
                <h2 className="mt-2 text-lg font-semibold text-zinc-50">
                  Governance Queue
                </h2>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
              {governance?.canReviewTasks ? (
                <article className="rounded-sm border border-neutral-800 bg-black/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                      Task Verification
                    </h3>
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-lime-400">
                      {pendingTaskApprovals.length.toString().padStart(2, "0")} queued
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {pendingTaskApprovals.length > 0 ? (
                      pendingTaskApprovals.map((task) => (
                        <div
                          key={task._id}
                          className="rounded-sm border border-neutral-800 bg-neutral-950 px-4 py-4"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-medium text-zinc-100">{task.title}</p>
                              <p className="mt-2 text-sm text-neutral-400">
                                Submitted by {resolveActorName(task.assignedTo ?? null, "NODE")}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => openApprovalEvidence(task)}
                              className="rounded-sm border border-neutral-800 bg-black px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-lime-400 transition hover:border-lime-400/30 hover:bg-lime-400/10"
                            >
                              VIEW_EVIDENCE
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-500">
                        No task submissions are waiting for governance review.
                      </p>
                    )}
                  </div>
                </article>
              ) : null}

              {governance?.canReviewCourses ? (
                <article className="rounded-sm border border-neutral-800 bg-black/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                      Course Access Requests
                    </h3>
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-lime-400">
                      {pendingCourseApprovals.length.toString().padStart(2, "0")} queued
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {pendingCourseApprovals.length > 0 ? (
                      pendingCourseApprovals.map((request) => (
                        <div
                          key={request._id}
                          className="rounded-sm border border-neutral-800 bg-neutral-950 px-4 py-4"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-medium text-zinc-100">
                                {request.requestedBy.name}
                              </p>
                              <p className="mt-2 text-sm text-neutral-400">
                                {request.course.title}
                              </p>
                              <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-lime-400">
                                Standing: +{request.standing.recentXpGain.toLocaleString()} XP
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => void handleApproveCourseRequest(request._id)}
                              disabled={busyCourseRequestId === request._id}
                              className="inline-flex items-center justify-center gap-2 rounded-sm bg-lime-400 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyCourseRequestId === request._id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : null}
                              {busyCourseRequestId === request._id
                                ? "APPROVING..."
                                : "APPROVE_ACCESS"}
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-500">
                        No pending course requests require review.
                      </p>
                    )}
                  </div>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)]">
          <article className="panel-surface rounded-sm border border-neutral-800 px-5 py-6 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
                  Personal Analytics
                </p>
                <h2 className="mt-2 text-lg font-semibold text-zinc-50">
                  Contribution Breakdown
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {analyticsMetrics.map((metric) => (
                <div key={metric.label}>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-zinc-400">{metric.label}</p>
                    <p className="font-mono text-sm text-zinc-100">
                      {metric.value.toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-neutral-800">
                    <div
                      className={[
                        "h-full rounded-full",
                        metric.accent ? "bg-lime-400" : "bg-zinc-300/60",
                      ].join(" ")}
                      style={{
                        width: `${Math.max(8, Math.round((metric.value / maxMetric) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel-surface rounded-sm border border-neutral-800 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-sm border border-lime-400/20 bg-lime-400/10 px-2 py-1 font-mono text-xs uppercase tracking-[0.18em] text-lime-300">
                Active Module
              </span>
              <BookOpen className="h-4 w-4 text-zinc-400" />
            </div>

            <h2 className="mt-5 text-lg font-semibold leading-tight text-zinc-50">
              {activeCourseTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {user.activeCourse?.title
                ? "This module is currently assigned to your node."
                : "No course is active yet. Your latest request status is shown below."}
            </p>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <span className="text-sm text-zinc-500">Latest Status</span>
                <span
                  className={[
                    "rounded-sm border px-2 py-1 font-mono text-xs uppercase tracking-[0.18em]",
                    latestCourseRequest
                      ? statusClasses(latestCourseRequest.status)
                      : "border-neutral-800 bg-neutral-950 text-zinc-500",
                  ].join(" ")}
                >
                  {latestCourseRequest ? formatStatus(latestCourseRequest.status) : "IDLE"}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <span className="text-sm text-zinc-500">Points Required</span>
                <span className="font-mono text-sm text-zinc-100">
                  {formatMetric(activeCourseCost)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Requested</span>
                <span className="font-mono text-sm text-zinc-100">
                  {formatTimestamp(latestCourseRequest?.requestedAt)}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="mt-6 w-full rounded-sm border border-neutral-800 bg-neutral-800/80 px-4 py-3 text-sm font-medium text-zinc-100"
            >
              {user.activeCourse?.title ? "MODULE ACTIVE" : "AWAITING ASSIGNMENT"}
            </button>
          </article>
        </section>

        <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-3 border-b border-neutral-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
                Redemption History
              </p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-50">
                Course Request Ledger
              </h2>
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">
              {courseRequests.length.toString().padStart(2, "0")} entries
            </p>
          </div>

          {courseRequests.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left">
                    <th className="pb-3 pr-6 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Course
                    </th>
                    <th className="pb-3 pr-6 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Requested
                    </th>
                    <th className="pb-3 pr-6 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Cost
                    </th>
                    <th className="pb-3 pr-6 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Status
                    </th>
                    <th className="pb-3 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Redemption
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {courseRequests.map((request) => (
                    <tr key={request._id} className="border-t border-neutral-800 align-top">
                      <td className="border-t border-neutral-800 py-4 pr-6 text-sm text-zinc-100">
                        {request.course.title}
                      </td>
                      <td className="border-t border-neutral-800 py-4 pr-6 font-mono text-xs text-zinc-400">
                        {formatTimestamp(request.requestedAt)}
                      </td>
                      <td className="border-t border-neutral-800 py-4 pr-6 font-mono text-sm text-zinc-100">
                        {formatMetric(request.course.pointsRequired)}
                      </td>
                      <td className="border-t border-neutral-800 py-4 pr-6">
                        <span
                          className={[
                            "rounded-sm border px-2 py-1 font-mono text-xs uppercase tracking-[0.18em]",
                            statusClasses(request.status),
                          ].join(" ")}
                        >
                          {formatStatus(request.status)}
                        </span>
                      </td>
                      <td className="border-t border-neutral-800 py-4 font-mono text-xs text-zinc-400">
                        {request.redemptionCode ?? request.adminNote ?? "Pending review"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-5 text-sm text-zinc-500">
              No course requests have been logged for this account yet.
            </p>
          )}
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
        currentUserId={user._id}
        busyAction={detailBusyAction}
        onClose={() => setSelectedTaskId(null)}
        onAcceptTransfer={handleAcceptTransfer}
        onWithdraw={handleWithdrawTask}
        onOpenSubmit={openSubmission}
      />

      <TaskApprovalModal
        open={Boolean(approvalTask)}
        task={approvalTask}
        approving={
          approvalBusyAction === "approve-task"
        }
        rejecting={
          approvalBusyAction === "reject-task"
        }
        onClose={() => setApprovalTaskId(null)}
        onApprove={handleApproveTaskSubmission}
        onReject={handleRejectTaskSubmission}
      />

      <TaskSubmissionModal
        key={
          submissionTask
            ? `${submissionTask._id}-${submissionTask.submissionDetails?.submittedAt ?? "new"}`
            : "dashboard-task-submission-closed"
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
