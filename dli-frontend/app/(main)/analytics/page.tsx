"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { API_BASE_URL } from "@/config/constants";

interface AuditLogRecord {
  _id: string;
  tag: string;
  action: string;
  message: string;
  timestamp: string;
  actor?: {
    _id?: string | null;
    name?: string | null;
    role?: string | null;
  } | null;
  metadata?: Record<string, unknown>;
}

interface CourseForAdmin {
  _id: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  pointsRequired: string | number;
  inventoryCount: number;
  isActive: boolean;
}

interface AnalyticsApiResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: {
    logs: AuditLogRecord[];
    systemConfig?: {
      systemPoolBalance?: number | string | null;
    } | null;
  };
}

function buildAnalyticsEndpoint() {
  const sanitizedBaseUrl = API_BASE_URL.replace(/\/$/, "");
  return sanitizedBaseUrl ? `${sanitizedBaseUrl}/admin/audit-feed?limit=250` : "";
}

function formatMetric(value: string | number | null | undefined) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value ?? "0");

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return numericValue.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

function formatFeedTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function resolveTagClasses(tag: string) {
  if (tag === "AUTH") {
    return "border-sky-400/20 bg-sky-400/10 text-sky-300";
  }

  if (tag === "CLAIM") {
    return "border-lime-400/20 bg-lime-400/10 text-lime-300";
  }

  if (tag === "POOL") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  if (tag === "GOVERNANCE") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  }

  if (tag === "QUERY") {
    return "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200";
  }

  if (tag === "PROFILE") {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
  }

  return "border-neutral-700 bg-neutral-900 text-neutral-300";
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"audit" | "inventory" | "task-factory">("audit");
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [courses, setCourses] = useState<CourseForAdmin[]>([]);
  const [systemPoolBalance, setSystemPoolBalance] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Task Factory form state
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    category: "Frontend",
    points: { base: "100", multiplier: "1" },
    difficulty: "beginner",
    priority: "medium",
  });

  // Inventory form state
  const [inventoryForm, setInventoryForm] = useState({
    courseId: "",
    inventoryCount: 0,
  });

  const loadAuditFeed = useCallback(
    async (options?: { silent?: boolean; signal?: AbortSignal }) => {
      const token = window.localStorage.getItem("token");
      const endpoint = buildAnalyticsEndpoint();

      if (!token) {
        router.replace("/login");
        return;
      }

      if (!endpoint) {
        setError("NEXT_PUBLIC_API_URL is not configured.");
        setLoading(false);
        return;
      }

      try {
        if (options?.silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          signal: options?.signal,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json().catch(() => null)) as AnalyticsApiResponse | null;

        if (!response.ok) {
          if (response.status === 401) {
            window.localStorage.removeItem("token");
            router.replace("/login");
            return;
          }

          if (response.status === 403) {
            throw new Error("System analytics are restricted to administrators.");
          }

          throw new Error(payload?.message ?? `Failed to load audit feed (${response.status}).`);
        }

        setLogs(Array.isArray(payload?.data?.logs) ? payload.data.logs : []);
        setSystemPoolBalance(payload?.data?.systemConfig?.systemPoolBalance ?? null);
      } catch (auditFeedError) {
        if (!options?.signal?.aborted) {
          setError(
            auditFeedError instanceof Error
              ? auditFeedError.message
              : "Unable to synchronize the Black Box feed.",
          );
          setLogs([]);
        }
      } finally {
        if (!options?.signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [router],
  );

  // Load courses for inventory tab
  const loadCourses = useCallback(async () => {
    const token = window.localStorage.getItem("token");
    if (!token) return;

    try {
      const endpoint = `${API_BASE_URL.replace(/\/$/, "")}/courses?limit=100`;
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCourses(data.data?.courses || []);
      }
    } catch (err) {
      console.error("Failed to load courses:", err);
    }
  }, []);

  // Submit task creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = window.localStorage.getItem("token");
    if (!token) return;

    setSubmitting(true);
    try {
      const endpoint = `${API_BASE_URL.replace(/\/$/, "")}/tasks`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create task");
      }

      setSuccessMessage("Task created successfully!");
      setTaskForm({
        title: "",
        description: "",
        category: "Frontend",
        points: { base: "100", multiplier: "1" },
        difficulty: "beginner",
        priority: "medium",
      });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit inventory update
  const handleUpdateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = window.localStorage.getItem("token");
    if (!token) return;

    setSubmitting(true);
    try {
      const endpoint = `${API_BASE_URL.replace(/\/$/, "")}/courses/${inventoryForm.courseId}`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventoryCount: inventoryForm.inventoryCount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update inventory");
      }

      setSuccessMessage("Inventory updated successfully!");
      await loadCourses(); // Reload courses
      setInventoryForm({ courseId: "", inventoryCount: 0 });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update inventory");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadAuditFeed({ signal: controller.signal });
    if (activeTab === "inventory") {
      void loadCourses();
    }
    return () => controller.abort();
  }, [loadAuditFeed, activeTab, loadCourses]);

  if (loading && activeTab === "audit") {
    return (
      <div className="panel-surface flex items-center gap-3 rounded-sm border border-neutral-800 px-5 py-5 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin text-lime-300" />
        <span className="font-mono uppercase tracking-[0.2em]">Opening black box feed...</span>
      </div>
    );
  }

  if (error && activeTab === "audit") {
    return (
      <div className="rounded-sm border border-rose-950 bg-rose-950/20 px-5 py-5 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
              The Black Box
            </p>
            <h1 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-zinc-50 sm:text-4xl">
              System <span className="text-lime-400">Analytics</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
              Terminal-grade audit intelligence and admin management tools for governance across
              the network.
            </p>
          </div>

          {activeTab === "audit" && (
            <button
              type="button"
              onClick={() => void loadAuditFeed({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-zinc-200 transition hover:border-lime-400/30 hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {refreshing ? "Refreshing..." : "Refresh Feed"}
            </button>
          )}
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-neutral-800">
        {["audit", "inventory", "task-factory"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`px-4 py-3 text-sm font-medium uppercase tracking-[0.1em] transition ${
              activeTab === tab
                ? "border-b-2 border-lime-400 text-lime-400"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {tab === "audit" ? "Audit Feed" : tab === "inventory" ? "Inventory" : "Task Factory"}
          </button>
        ))}
      </div>

      {/* Success Message */}
      {successMessage && (
        <section className="flex items-center gap-3 rounded-sm border border-lime-950 bg-lime-950/20 px-4 py-4 text-sm text-lime-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMessage}
        </section>
      )}

      {/* Error Message */}
      {error && (
        <section className="flex items-center gap-3 rounded-sm border border-rose-950 bg-rose-950/20 px-4 py-4 text-sm text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </section>
      )}

      {/* Audit Tab */}
      {activeTab === "audit" && (
        <>
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <article className="panel-surface rounded-sm border border-neutral-800 px-5 py-5">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-lime-300" />
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-500">
                  System Pool
                </p>
              </div>
              <p className="mt-4 font-mono text-3xl font-semibold text-zinc-100">
                {formatMetric(systemPoolBalance)}
              </p>
            </article>

            <article className="panel-surface rounded-sm border border-neutral-800 px-5 py-5">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-4 w-4 text-rose-300" />
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-500">
                  Governance Mirror
                </p>
              </div>
              <p className="mt-4 font-mono text-3xl font-semibold text-zinc-100">
                {logs.filter((log) => log.tag === "GOVERNANCE").length.toString().padStart(2, "0")}
              </p>
            </article>

            <article className="panel-surface rounded-sm border border-neutral-800 px-5 py-5">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-sky-300" />
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-500">
                  Feed Density
                </p>
              </div>
              <p className="mt-4 font-mono text-3xl font-semibold text-zinc-100">
                {logs.length.toString().padStart(3, "0")}
              </p>
            </article>
          </section>

          <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6 sm:px-6">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-5">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
                  Audit Feed
                </p>
                <h2 className="mt-2 text-lg font-semibold text-zinc-50">Central Command Timeline</h2>
              </div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
                {logs.length.toString().padStart(3, "0")} entries
              </p>
            </div>

            <div className="mt-6 max-h-[65vh] space-y-3 overflow-y-auto rounded-sm border border-neutral-800 bg-black p-4">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <article
                    key={log._id}
                    className="rounded-sm border border-neutral-800 bg-neutral-950 px-4 py-4 font-mono text-sm text-zinc-200"
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <p className="break-words text-sm leading-6 text-zinc-200">
                          [{formatFeedTimestamp(log.timestamp)}] [{log.action}] {log.message}
                        </p>
                      </div>

                      <span
                        className={[
                          "self-start rounded-sm border px-2 py-1 text-[11px] uppercase tracking-[0.18em]",
                          resolveTagClasses(log.tag),
                        ].join(" ")}
                      >
                        {log.tag}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="font-mono text-sm uppercase tracking-[0.18em] text-neutral-500">
                  No audit entries are available.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      {/* Inventory Tab */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6">
            <h2 className="text-lg font-semibold text-zinc-50">Course Inventory Management</h2>
            <p className="mt-2 text-sm text-neutral-400">Add or edit course inventory counts.</p>

            {courses.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">No courses available.</p>
            ) : (
              <form onSubmit={handleUpdateInventory} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-100">Select Course</label>
                  <select
                    value={inventoryForm.courseId}
                    onChange={(e) => {
                      const course = courses.find((c) => c._id === e.target.value);
                      setInventoryForm({
                        courseId: e.target.value,
                        inventoryCount: course?.inventoryCount ?? 0,
                      });
                    }}
                    className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                  >
                    <option value="">-- Select a course --</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.title} ({course.inventoryCount} available)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-100">Inventory Count</label>
                  <input
                    type="number"
                    min="0"
                    value={inventoryForm.inventoryCount}
                    onChange={(e) =>
                      setInventoryForm({
                        ...inventoryForm,
                        inventoryCount: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !inventoryForm.courseId}
                  className="inline-flex items-center gap-2 rounded-sm bg-lime-400 px-4 py-2 text-sm font-semibold uppercase text-neutral-950 transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Update Inventory
                </button>
              </form>
            )}
          </section>

          <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6">
            <h3 className="text-lg font-semibold text-zinc-50">Available Courses</h3>
            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2">
              {courses.map((course) => (
                <div
                  key={course._id}
                  className="flex items-center justify-between rounded-sm border border-neutral-800 bg-neutral-950/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{course.title}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {course.level} • {course.inventoryCount} available
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-sm border px-2 py-1 text-xs uppercase tracking-[0.18em] ${
                      course.isActive
                        ? "border-lime-400/20 bg-lime-400/10 text-lime-400"
                        : "border-neutral-600/20 bg-neutral-900/10 text-neutral-400"
                    }`}
                  >
                    {course.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Task Factory Tab */}
      {activeTab === "task-factory" && (
        <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6">
          <h2 className="text-lg font-semibold text-zinc-50">Task Factory - Deploy New Tasks</h2>
          <p className="mt-2 text-sm text-neutral-400">Create and publish new bounty tasks for the network.</p>

          <form onSubmit={handleCreateTask} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-100">Task Title</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g., Implement Dark Mode"
                  required
                  className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100 placeholder-neutral-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-100">Category</label>
                <select
                  value={taskForm.category}
                  onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                  className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                >
                  {["Frontend", "ML", "DevOps", "Content"].map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-100">Base Points</label>
                <input
                  type="number"
                  min="0"
                  value={taskForm.points.base}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      points: { ...taskForm.points, base: e.target.value },
                    })
                  }
                  required
                  className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-100">Multiplier</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={taskForm.points.multiplier}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      points: { ...taskForm.points, multiplier: e.target.value },
                    })
                  }
                  className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-100">Difficulty</label>
                <select
                  value={taskForm.difficulty}
                  onChange={(e) => setTaskForm({ ...taskForm, difficulty: e.target.value })}
                  className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                >
                  {["beginner", "intermediate", "advanced"].map((diff) => (
                    <option key={diff} value={diff}>
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-100">Priority</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                >
                  {["low", "medium", "high", "critical"].map((pri) => (
                    <option key={pri} value={pri}>
                      {pri.charAt(0).toUpperCase() + pri.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100">Description</label>
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Detailed task description..."
                required
                rows={5}
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100 placeholder-neutral-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-sm bg-lime-400 px-6 py-3 text-sm font-semibold uppercase text-neutral-950 transition disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Deploy Task
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
