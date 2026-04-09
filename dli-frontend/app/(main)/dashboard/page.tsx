"use client";

import { useEffect, useState } from "react";
import { Activity, BookOpen, Clock3, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { API_BASE_URL } from "@/config/constants";
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
  course: {
    _id: string;
    title: string;
    pointsRequired: string;
  };
}

interface DashboardPayload {
  user: DashboardUser;
  courseRequests: CourseRequestRecord[];
  activeTasks: TaskRecord[];
  claimedTasks?: TaskRecord[];
}

interface DashboardApiResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: DashboardPayload;
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

  useEffect(() => {
    const token = window.localStorage.getItem("token");
    const dashboardEndpoint = buildDashboardEndpoint();
    const controller = new AbortController();

    if (!token) {
      router.push("/login");
      return () => controller.abort();
    }

    if (!dashboardEndpoint) {
      setError("NEXT_PUBLIC_API_URL is not configured.");
      setLoading(false);
      return () => controller.abort();
    }

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(dashboardEndpoint, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json().catch(() => null)) as DashboardApiResponse | null;

        if (!response.ok) {
          if (response.status === 401) {
            window.localStorage.removeItem("token");
            router.push("/login");
            return;
          }

          throw new Error(payload?.message ?? `Failed to load dashboard (${response.status}).`);
        }

        if (!payload?.data) {
          throw new Error("Dashboard response is missing required data.");
        }

        setDashboard(payload.data);
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
  }, [router]);

  if (loading) {
    return (
      <div className="panel-surface flex items-center gap-3 rounded-sm border border-neutral-800 px-5 py-5 text-sm text-zinc-400">
        <LoaderCircle className="h-4 w-4 animate-spin text-lime-300" />
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
  const activeTasks = dashboard.claimedTasks ?? dashboard.activeTasks;
  const pointsBalance = parseMetric(user.points.balance);
  const totalEarned = parseMetric(user.points.totalEarned);
  const totalSpent = parseMetric(user.points.totalSpent);
  const latestCourseRequest = courseRequests[0] ?? null;
  const activeCourseTitle =
    user.activeCourse?.title ?? latestCourseRequest?.course.title ?? "No Active Course";
  const activeCourseCost =
    user.activeCourse?.pointsRequired ?? latestCourseRequest?.course.pointsRequired ?? "0";
  const activityDenominator = Math.max(
    activeTasks.length + courseRequests.length,
    1,
  );
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

  return (
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
                activeTasks.slice(0, 3).map((task) => (
                  <div
                    key={task._id}
                    className="rounded-sm border border-neutral-800 bg-neutral-950 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-zinc-100">{task.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-4 text-xs">
                      <span className="font-mono uppercase tracking-[0.18em] text-zinc-500">
                        {formatStatus(task.status)}
                      </span>
                      <span className="font-mono text-lime-300">
                        {task.points.effective.toLocaleString()} XP
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">
                  No active tasks are currently attached to this account.
                </p>
              )}
            </div>
          </article>
        </div>
      </section>

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
  );
}
