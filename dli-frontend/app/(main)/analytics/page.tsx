"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { API_BASE_URL, TASK_CATEGORIES } from "@/config/constants";

interface AuditLogRecord {
  _id: string;
  tag: string;
  action: string;
  message: string;
  timestamp: string;
}

interface CourseForAdmin {
  _id: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  pointsRequired: string | number;
  inventoryCount: number;
  isActive: boolean;
  courseUrl?: string | null;
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

interface AdminUserCreateResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: {
    temporaryPassword?: string | null;
  };
}

interface BulkImportResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: {
    insertedCount?: number;
    skippedCount?: number;
    validationErrors?: Array<{ index: number; message: string }>;
    writeErrors?: Array<{ index: number; message: string }>;
  };
}

type AnalyticsTab = "audit" | "users" | "tasks" | "courses";
type SubmitAction =
  | "user"
  | "task"
  | "course"
  | "bulk-users"
  | "bulk-tasks"
  | "bulk-courses"
  | null;

function sanitizeBaseUrl() {
  return API_BASE_URL.replace(/\/$/, "");
}

function buildAnalyticsEndpoint() {
  const sanitizedBaseUrl = sanitizeBaseUrl();
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

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium uppercase tracking-widest transition whitespace-nowrap ${
        active
          ? "border-b-2 border-lime-400 text-lime-400"
          : "text-neutral-500 hover:text-neutral-300"
      }`}
    >
      {label}
    </button>
  );
}

function BulkImportSection({
  title,
  description,
  file,
  busy,
  onFileChange,
  onSubmit,
}: {
  title: string;
  description: string;
  file: File | null;
  busy: boolean;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">BULK_IMPORT</p>
      <h2 className="mt-3 text-lg font-semibold text-zinc-50">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>

      <div className="mt-6 rounded-sm border border-dashed border-neutral-700 bg-black/50 p-4">
        <label className="block text-sm font-medium text-zinc-100">Payload File</label>
        <input
          type="file"
          accept=".csv,.json"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          className="mt-2 block w-full text-sm text-neutral-400 file:mr-4 file:rounded-sm file:border-0 file:bg-lime-400 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
        />
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-neutral-500">
          ACCEPTS .CSV AND .JSON / INSERTMANY SEED PATH
        </p>
        {file ? (
          <p className="mt-2 text-sm text-lime-300">{file.name}</p>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">NO_FILE_SELECTED</p>
        )}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={busy || !file}
        className="mt-5 inline-flex items-center gap-2 rounded-sm border border-lime-400/30 bg-lime-400/10 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-lime-300 transition hover:bg-lime-400/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
        {busy ? "IMPORTING..." : "EXECUTE_IMPORT"}
      </button>
    </section>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("audit");
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [courses, setCourses] = useState<CourseForAdmin[]>([]);
  const [systemPoolBalance, setSystemPoolBalance] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<SubmitAction>(null);
  const [taskForm, setTaskForm] = useState<{
    title: string;
    description: string;
    category: (typeof TASK_CATEGORIES)[number];
    basePoints: string;
    multiplier: string;
    isHotBounty: boolean;
    repoUrl: string;
  }>({
    title: "",
    description: "",
    category: TASK_CATEGORIES[0],
    basePoints: "100",
    multiplier: "1",
    isHotBounty: false,
    repoUrl: "",
  });
  const [courseForm, setCourseForm] = useState({
    title: "",
    level: "Beginner",
    xpCost: "100",
    provider: "",
    inventoryCount: 1,
    imageUrl: "",
    courseUrl: "",
  });
  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    srmRegNo: "",
    role: "member",
    password: "",
  });
  const [bulkFiles, setBulkFiles] = useState<{
    users: File | null;
    tasks: File | null;
    courses: File | null;
  }>({
    users: null,
    tasks: null,
    courses: null,
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

  const loadCourses = useCallback(async () => {
    const token = window.localStorage.getItem("token");

    if (!token) {
      return;
    }

    try {
      const endpoint = `${sanitizeBaseUrl()}/courses?limit=100`;
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
    } catch (loadCoursesError) {
      console.error("Failed to load courses:", loadCoursesError);
    }
  }, []);

  const courseSummary = useMemo(
    () => ({
      active: courses.filter((course) => course.isActive).length,
      totalStock: courses.reduce((sum, course) => sum + (course.inventoryCount || 0), 0),
    }),
    [courses],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadAuditFeed({ signal: controller.signal });
    void loadCourses();
    return () => controller.abort();
  }, [loadAuditFeed, loadCourses]);

  async function handleCreateTask(event: React.FormEvent) {
    event.preventDefault();
    const token = window.localStorage.getItem("token");

    if (!token) {
      return;
    }

    setSubmittingAction("task");
    setError(null);
    setTemporaryPassword(null);

    try {
      const effectivePoints =
        Number.parseFloat(taskForm.basePoints || "0") *
        Number.parseFloat(taskForm.multiplier || "1");

      const response = await fetch(`${sanitizeBaseUrl()}/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          category: taskForm.category,
          points: {
            base: Number.parseFloat(taskForm.basePoints || "0"),
            multiplier: Number.parseFloat(taskForm.multiplier || "1"),
            effective: effectivePoints,
          },
          difficulty: "beginner",
          priority: "medium",
          isHotBounty: taskForm.isHotBounty,
          repoUrl: taskForm.repoUrl.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to create task.");
      }

      setTaskForm({
        title: "",
        description: "",
        category: TASK_CATEGORIES[0],
        basePoints: "100",
        multiplier: "1",
        isHotBounty: false,
        repoUrl: "",
      });
      setSuccessMessage("TASK_DEPLOYED_SUCCESSFULLY");
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : "Failed to create task.");
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleCreateCourse(event: React.FormEvent) {
    event.preventDefault();
    const token = window.localStorage.getItem("token");

    if (!token) {
      return;
    }

    setSubmittingAction("course");
    setError(null);
    setTemporaryPassword(null);

    try {
      const response = await fetch(`${sanitizeBaseUrl()}/courses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: courseForm.title,
          description: `${courseForm.title} from ${courseForm.provider} for ${courseForm.level.toLowerCase()} learners.`,
          category: courseForm.provider,
          level: courseForm.level,
          provider: courseForm.provider,
          pointsRequired: Number.parseFloat(courseForm.xpCost || "0"),
          inventoryCount: Math.max(0, Number.parseInt(String(courseForm.inventoryCount), 10) || 0),
          imageUrl: courseForm.imageUrl,
          courseUrl: courseForm.courseUrl,
          isActive: true,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to create course.");
      }

      setCourseForm({
        title: "",
        level: "Beginner",
        xpCost: "100",
        provider: "",
        inventoryCount: 1,
        imageUrl: "",
        courseUrl: "",
      });
      await loadCourses();
      setSuccessMessage("COURSE_REGISTERED_SUCCESSFULLY");
    } catch (courseError) {
      setError(courseError instanceof Error ? courseError.message : "Failed to create course.");
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleCreateMember(event: React.FormEvent) {
    event.preventDefault();
    const token = window.localStorage.getItem("token");

    if (!token) {
      return;
    }

    setSubmittingAction("user");
    setError(null);

    try {
      const response = await fetch(`${sanitizeBaseUrl()}/admin/users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: memberForm.name,
          email: memberForm.email,
          srmRegNo: memberForm.srmRegNo,
          role: memberForm.role,
          password: memberForm.password.trim() || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as AdminUserCreateResponse | null;

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to create account.");
      }

      setTemporaryPassword(payload?.data?.temporaryPassword ?? null);
      setMemberForm({
        name: "",
        email: "",
        srmRegNo: "",
        role: "member",
        password: "",
      });
      setSuccessMessage("ACCOUNT_CREATED_SUCCESSFULLY");
    } catch (memberError) {
      setError(memberError instanceof Error ? memberError.message : "Failed to create account.");
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleBulkImport(kind: "users" | "tasks" | "courses") {
    const token = window.localStorage.getItem("token");
    const file = bulkFiles[kind];

    if (!token || !file) {
      return;
    }

    setSubmittingAction(`bulk-${kind}` as SubmitAction);
    setError(null);
    setTemporaryPassword(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${sanitizeBaseUrl()}/admin/bulk-${kind}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as BulkImportResponse | null;

      if (!response.ok) {
        throw new Error(payload?.message || `Failed to bulk import ${kind}.`);
      }

      const insertedCount = payload?.data?.insertedCount ?? 0;
      const skippedCount = payload?.data?.skippedCount ?? 0;

      setBulkFiles((current) => ({
        ...current,
        [kind]: null,
      }));

      if (kind === "courses") {
        await loadCourses();
      }

      setSuccessMessage(
        `${kind.toUpperCase()} BULK IMPORT COMPLETE / INSERTED ${insertedCount} / SKIPPED ${skippedCount}`,
      );
    } catch (bulkImportError) {
      setError(
        bulkImportError instanceof Error
          ? bulkImportError.message
          : `Failed to bulk import ${kind}.`,
      );
    } finally {
      setSubmittingAction(null);
    }
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
              Audit intelligence, rapid seeding tools, and direct command controls for operators
              managing users, tasks, and course modules.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAuditFeed({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-zinc-200 transition hover:border-lime-400/30 hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {refreshing ? "Refreshing..." : "Refresh Feed"}
          </button>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto border-b border-neutral-800">
        <TabButton active={activeTab === "audit"} label="Audit Feed" onClick={() => setActiveTab("audit")} />
        <TabButton active={activeTab === "users"} label="Users" onClick={() => setActiveTab("users")} />
        <TabButton active={activeTab === "tasks"} label="Tasks" onClick={() => setActiveTab("tasks")} />
        <TabButton active={activeTab === "courses"} label="Courses" onClick={() => setActiveTab("courses")} />
      </div>

      {successMessage ? (
        <section className="flex items-center gap-3 rounded-sm border border-lime-950 bg-lime-950/20 px-4 py-4 text-sm text-lime-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMessage}
        </section>
      ) : null}

      {temporaryPassword ? (
        <section className="rounded-sm border border-lime-400 bg-lime-400/10 px-4 py-4 text-lime-100">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-lime-300">
            Provisioned Password
          </p>
          <code className="mt-3 block rounded-sm border border-lime-400/40 bg-black/40 px-4 py-3 text-lg font-semibold text-lime-300">
            {temporaryPassword}
          </code>
        </section>
      ) : null}

      {error ? (
        <section className="flex items-center gap-3 rounded-sm border border-rose-950 bg-rose-950/20 px-4 py-4 text-sm text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </section>
      ) : null}

      {activeTab === "audit" ? (
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
                {loading ? "SYNCING" : `${logs.length.toString().padStart(3, "0")} entries`}
              </p>
            </div>

            <div className="mt-6 max-h-[65vh] space-y-3 overflow-y-auto rounded-sm border border-neutral-800 bg-black p-4">
              {loading ? (
                <p className="font-mono text-sm uppercase tracking-[0.18em] text-neutral-500">
                  Opening black box feed...
                </p>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <article
                    key={log._id}
                    className="rounded-sm border border-neutral-800 bg-neutral-950 px-4 py-4 font-mono text-sm text-zinc-200"
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <p className="wrap-break-word text-sm leading-6 text-zinc-200">
                        [{formatFeedTimestamp(log.timestamp)}] [{log.action}] {log.message}
                      </p>

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
      ) : null}

      {activeTab === "users" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
              Account Creator
            </p>
            <h2 className="mt-3 text-lg font-semibold text-zinc-50">Manual Node Onboarding</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Create operator accounts directly, define the role, and provision an explicit
              password at creation time.
            </p>

            <form onSubmit={handleCreateMember} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-100">Name</label>
                  <input
                    type="text"
                    value={memberForm.name}
                    onChange={(event) => setMemberForm({ ...memberForm, name: event.target.value })}
                    required
                    className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-100">Email</label>
                  <input
                    type="email"
                    value={memberForm.email}
                    onChange={(event) => setMemberForm({ ...memberForm, email: event.target.value })}
                    required
                    className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-100">SRM Reg No</label>
                  <input
                    type="text"
                    value={memberForm.srmRegNo}
                    onChange={(event) => setMemberForm({ ...memberForm, srmRegNo: event.target.value })}
                    required
                    className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-100">Role</label>
                  <select
                    value={memberForm.role}
                    onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value })}
                    className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-100">Password</label>
                <input
                  type="text"
                  value={memberForm.password}
                  onChange={(event) => setMemberForm({ ...memberForm, password: event.target.value })}
                  placeholder="Leave blank to auto-generate"
                  className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100 placeholder-neutral-600"
                />
              </div>

              <button
                type="submit"
                disabled={submittingAction === "user"}
                className="inline-flex items-center gap-2 rounded-sm bg-lime-400 px-5 py-3 text-sm font-semibold uppercase text-neutral-950 transition disabled:opacity-50"
              >
                {submittingAction === "user" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Account
              </button>
            </form>
          </section>

          <BulkImportSection
            title="User Seed Pipeline"
            description="Upload a CSV or JSON payload of user records. The backend parses the file and uses insertMany() for high-speed account seeding."
            file={bulkFiles.users}
            busy={submittingAction === "bulk-users"}
            onFileChange={(file) => setBulkFiles((current) => ({ ...current, users: file }))}
            onSubmit={() => void handleBulkImport("users")}
          />
        </div>
      ) : null}

      {activeTab === "tasks" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
              Task Factory
            </p>
            <h2 className="mt-3 text-lg font-semibold text-zinc-50">Bounty Deployment</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Draft tasks, mark hot bounties visually, and attach the SYSTEM_LINK / SOURCE before
              deployment.
            </p>

            <form onSubmit={handleCreateTask} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-100">Title</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                  required
                  className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-100">Category</label>
                <select
                  value={taskForm.category}
                  onChange={(event) => setTaskForm({ ...taskForm, category: event.target.value as (typeof TASK_CATEGORIES)[number] })}
                  className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                >
                  {TASK_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-100">Base Points</label>
                  <input
                    type="number"
                    min="0"
                    value={taskForm.basePoints}
                    onChange={(event) => setTaskForm({ ...taskForm, basePoints: event.target.value })}
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
                    value={taskForm.multiplier}
                    onChange={(event) => setTaskForm({ ...taskForm, multiplier: event.target.value })}
                    required
                    className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-sm border border-neutral-800 bg-black/60 px-4 py-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                    Hot Bounty
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">
                    Highlight this task in the hot bounty stream.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={taskForm.isHotBounty}
                  onClick={() =>
                    setTaskForm((current) => ({
                      ...current,
                      isHotBounty: !current.isHotBounty,
                    }))
                  }
                  className={`relative inline-flex h-8 w-16 items-center rounded-full border transition ${
                    taskForm.isHotBounty
                      ? "border-lime-300 bg-lime-400/20 shadow-[0_0_10px_rgba(163,230,53,0.4)]"
                      : "border-neutral-700 bg-neutral-900"
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 rounded-full bg-white transition ${
                      taskForm.isHotBounty ? "translate-x-9" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-100">
                  SYSTEM_LINK / SOURCE
                </label>
                <input
                  type="url"
                  value={taskForm.repoUrl}
                  onChange={(event) => setTaskForm({ ...taskForm, repoUrl: event.target.value })}
                  placeholder="https://github.com/org/repo or deployment URL"
                  className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100 placeholder-neutral-600"
                />
              </div>

              <div className="rounded-sm border border-lime-400/20 bg-lime-400/10 px-4 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime-300">
                  Effective Points
                </p>
                <p className="mt-2 text-2xl font-semibold text-lime-200">
                  {formatMetric(
                    Number.parseFloat(taskForm.basePoints || "0") *
                      Number.parseFloat(taskForm.multiplier || "1"),
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-100">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}
                  rows={8}
                  required
                  className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                />
              </div>

              <button
                type="submit"
                disabled={submittingAction === "task"}
                className="inline-flex items-center gap-2 rounded-sm bg-lime-400 px-5 py-3 text-sm font-semibold uppercase text-neutral-950 transition disabled:opacity-50"
              >
                {submittingAction === "task" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Deploy Task
              </button>
            </form>
          </section>

          <BulkImportSection
            title="Task Seed Pipeline"
            description="Upload CSV or JSON task payloads. The backend parses the file and uses insertMany() to seed the board at speed."
            file={bulkFiles.tasks}
            busy={submittingAction === "bulk-tasks"}
            onFileChange={(file) => setBulkFiles((current) => ({ ...current, tasks: file }))}
            onSubmit={() => void handleBulkImport("tasks")}
          />
        </div>
      ) : null}

      {activeTab === "courses" ? (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
                Course Factory
              </p>
              <h2 className="mt-3 text-lg font-semibold text-zinc-50">Module Registration</h2>
              <p className="mt-2 text-sm text-neutral-400">
                Register a module with launch URL, provider metadata, and initial stock.
              </p>

              <form onSubmit={handleCreateCourse} className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-100">Title</label>
                    <input
                      type="text"
                      value={courseForm.title}
                      onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })}
                      required
                      className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-100">Provider</label>
                    <input
                      type="text"
                      value={courseForm.provider}
                      onChange={(event) => setCourseForm({ ...courseForm, provider: event.target.value })}
                      required
                      className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-100">Level</label>
                    <select
                      value={courseForm.level}
                      onChange={(event) => setCourseForm({ ...courseForm, level: event.target.value })}
                      className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                    >
                      {["Beginner", "Intermediate", "Advanced"].map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-100">XP Cost</label>
                    <input
                      type="number"
                      min="0"
                      value={courseForm.xpCost}
                      onChange={(event) => setCourseForm({ ...courseForm, xpCost: event.target.value })}
                      required
                      className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-100">Image URL</label>
                    <input
                      type="url"
                      value={courseForm.imageUrl}
                      onChange={(event) => setCourseForm({ ...courseForm, imageUrl: event.target.value })}
                      required
                      className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-100">Course URL</label>
                    <input
                      type="url"
                      value={courseForm.courseUrl}
                      onChange={(event) => setCourseForm({ ...courseForm, courseUrl: event.target.value })}
                      required
                      className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-100">Inventory Count</label>
                  <input
                    type="number"
                    min="0"
                    value={courseForm.inventoryCount}
                    onChange={(event) =>
                      setCourseForm({
                        ...courseForm,
                        inventoryCount: Math.max(0, Number.parseInt(event.target.value, 10) || 0),
                      })
                    }
                    required
                    className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAction === "course"}
                  className="inline-flex items-center gap-2 rounded-sm bg-lime-400 px-5 py-3 text-sm font-semibold uppercase text-neutral-950 transition disabled:opacity-50"
                >
                  {submittingAction === "course" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Course
                </button>
              </form>
            </section>

            <BulkImportSection
              title="Course Seed Pipeline"
              description="Upload CSV or JSON course payloads with courseUrl present for direct module access. The backend parses the file and uses insertMany()."
              file={bulkFiles.courses}
              busy={submittingAction === "bulk-courses"}
              onFileChange={(file) => setBulkFiles((current) => ({ ...current, courses: file }))}
              onSubmit={() => void handleBulkImport("courses")}
            />
          </div>

          <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6">
            <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
                  Registered Modules
                </p>
                <h2 className="mt-2 text-lg font-semibold text-zinc-50">Course Inventory Snapshot</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-sm border border-neutral-800 bg-black px-4 py-3">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Active
                  </p>
                  <p className="mt-2 text-xl font-semibold text-lime-300">
                    {courseSummary.active.toString().padStart(2, "0")}
                  </p>
                </div>
                <div className="rounded-sm border border-neutral-800 bg-black px-4 py-3">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Stock
                  </p>
                  <p className="mt-2 text-xl font-semibold text-zinc-100">
                    {courseSummary.totalStock.toString().padStart(2, "0")}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {courses.map((course) => (
                <article
                  key={course._id}
                  className="rounded-sm border border-neutral-800 bg-black/50 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-100">
                        {course.title}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
                        {course.level} / {formatMetric(course.pointsRequired)} XP / {course.inventoryCount} available
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-sm border px-2 py-1 text-xs uppercase tracking-[0.18em] ${
                        course.isActive
                          ? "border-lime-400/20 bg-lime-400/10 text-lime-300"
                          : "border-neutral-700 bg-neutral-900 text-neutral-400"
                      }`}
                    >
                      {course.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>

                  {course.courseUrl ? (
                    <a
                      href={course.courseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex rounded-sm border border-neutral-800 bg-black px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-lime-300 transition hover:border-lime-400/30 hover:bg-lime-400/10"
                    >
                      OPEN_MODULE
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
