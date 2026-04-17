"use client";

import { useState } from "react";
import { Loader2, Plus, ShieldPlus, UserPlus } from "lucide-react";

import {
  CustomPointsModal,
  type CustomPointsMemberOption,
} from "@/components/dashboard/custom-points-modal";
import { API_BASE_URL, TASK_CATEGORIES } from "@/config/constants";
import { TaskModalShell } from "@/components/task-board/task-modal-shell";
import {
  awardAdminCustomPoints,
  type AwardCustomPointsRequest,
  UnauthorizedError,
} from "@/lib/api";

type OperatorRole = "member" | "admin" | "moderator";
type ToolboxModal = "task" | "course" | "account" | "custom-points" | null;
type ToolboxAction = "task" | "course" | "account" | "custom-points" | null;

interface AdminToolboxProps {
  userRole: OperatorRole;
  members: CustomPointsMemberOption[];
  membersLoading?: boolean;
  onUnauthorized: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface AdminUserCreateResponse {
  success: boolean;
  message?: string;
  data?: {
    temporaryPassword?: string | null;
  };
}

function buildEndpoint(path: string) {
  const sanitizedBaseUrl = API_BASE_URL.replace(/\/$/, "");
  return sanitizedBaseUrl ? `${sanitizedBaseUrl}${path}` : "";
}

export function AdminToolbox({
  userRole,
  members,
  membersLoading = false,
  onUnauthorized,
  onSuccess,
  onError,
}: AdminToolboxProps) {
  const [openModal, setOpenModal] = useState<ToolboxModal>(null);
  const [submitting, setSubmitting] = useState<ToolboxAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
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
    imageUrl: "",
    courseUrl: "",
    inventoryCount: 1,
  });
  const [accountForm, setAccountForm] = useState({
    name: "",
    email: "",
    srmRegNo: "",
    role: "member",
    password: "",
  });

  function closeModal() {
    setOpenModal(null);
    setError(null);
  }

  async function submitTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = window.localStorage.getItem("token");

    if (!token) {
      onUnauthorized();
      return;
    }

    setSubmitting("task");
    setError(null);

    try {
      const effectivePoints =
        Number.parseFloat(taskForm.basePoints || "0") *
        Number.parseFloat(taskForm.multiplier || "1");
      const endpoint = buildEndpoint("/tasks");
      const response = await fetch(endpoint, {
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
          effectivePoints,
          difficulty: "beginner",
          priority: "medium",
          isHotBounty: taskForm.isHotBounty,
          repoUrl: taskForm.repoUrl.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          onUnauthorized();
          return;
        }

        throw new Error(payload?.message ?? "Failed to create task.");
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
      closeModal();
      onSuccess("CREATE_TASK_COMPLETE");
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : "Failed to create task.");
    } finally {
      setSubmitting(null);
    }
  }

  async function submitCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = window.localStorage.getItem("token");

    if (!token) {
      onUnauthorized();
      return;
    }

    setSubmitting("course");
    setError(null);

    try {
      const endpoint = buildEndpoint("/courses");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: courseForm.title,
          description: `${courseForm.title} from ${courseForm.provider} for ${courseForm.level.toLowerCase()} operators.`,
          pointsRequired: Number.parseFloat(courseForm.xpCost || "0"),
          imageUrl: courseForm.imageUrl,
          courseUrl: courseForm.courseUrl,
          category: courseForm.provider,
          level: courseForm.level,
          provider: courseForm.provider,
          inventoryCount: courseForm.inventoryCount,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          onUnauthorized();
          return;
        }

        throw new Error(payload?.message ?? "Failed to create course.");
      }

      setCourseForm({
        title: "",
        level: "Beginner",
        xpCost: "100",
        provider: "",
        imageUrl: "",
        courseUrl: "",
        inventoryCount: 1,
      });
      closeModal();
      onSuccess("CREATE_COURSE_COMPLETE");
    } catch (courseError) {
      setError(courseError instanceof Error ? courseError.message : "Failed to create course.");
    } finally {
      setSubmitting(null);
    }
  }

  async function submitAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = window.localStorage.getItem("token");

    if (!token) {
      onUnauthorized();
      return;
    }

    setSubmitting("account");
    setError(null);

    try {
      const endpoint = buildEndpoint("/admin/users");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...accountForm,
          password: accountForm.password.trim() || undefined,
        }),
      });

      const payload =
        (await response.json().catch(() => null)) as AdminUserCreateResponse | null;

      if (!response.ok) {
        if (response.status === 401) {
          onUnauthorized();
          return;
        }

        throw new Error(payload?.message ?? "Failed to create account.");
      }

      setTemporaryPassword(payload?.data?.temporaryPassword ?? null);
      setAccountForm({
        name: "",
        email: "",
        srmRegNo: "",
        role: "member",
        password: "",
      });
      closeModal();
      onSuccess("ACCOUNT_CREATOR_COMPLETE");
    } catch (accountError) {
      setError(accountError instanceof Error ? accountError.message : "Failed to create account.");
    } finally {
      setSubmitting(null);
    }
  }

  async function submitCustomPoints(payload: AwardCustomPointsRequest) {
    const token = window.localStorage.getItem("token");

    if (!token) {
      onUnauthorized();
      return;
    }

    setSubmitting("custom-points");
    setError(null);

    try {
      await awardAdminCustomPoints(token, payload);
      closeModal();
      onSuccess("CUSTOM_POINTS_AWARDED");
    } catch (customPointsError) {
      if (customPointsError instanceof UnauthorizedError) {
        onUnauthorized();
        return;
      }

      const message =
        customPointsError instanceof Error
          ? customPointsError.message
          : "Failed to award custom points.";
      setError(message);
      onError(message);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
              Admin Toolbox
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-50">In-Situ Command Tools</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
              Launch creation flows directly from the dashboard without breaking operator context.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setOpenModal("task")}
              className="rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-zinc-100 transition hover:border-lime-400/30 hover:text-lime-400"
            >
              [CREATE_TASK]
            </button>
            <button
              type="button"
              onClick={() => setOpenModal("course")}
              className="rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-zinc-100 transition hover:border-lime-400/30 hover:text-lime-400"
            >
              [CREATE_COURSE]
            </button>
            <button
              type="button"
              onClick={() => setOpenModal("account")}
              className="rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-zinc-100 transition hover:border-lime-400/30 hover:text-lime-400"
            >
              [ACCOUNT_CREATOR]
            </button>
            {userRole === "admin" ? (
              <button
                type="button"
                onClick={() => setOpenModal("custom-points")}
                className="rounded-sm border border-lime-400/30 bg-lime-400/10 px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-lime-300 transition hover:border-lime-300 hover:bg-lime-400/15 hover:text-lime-200"
              >
                + Award Blank Points
              </button>
            ) : null}
          </div>
        </div>

        {temporaryPassword ? (
          <div className="mt-5 rounded-sm border border-lime-400 bg-lime-400/10 px-4 py-4 text-lime-100">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-lime-300">
              Temporary Password
            </p>
            <code className="mt-3 block rounded-sm border border-lime-400/30 bg-black/40 px-4 py-3 text-lg font-semibold text-lime-300">
              {temporaryPassword}
            </code>
          </div>
        ) : null}
      </section>

      <TaskModalShell
        open={openModal === "task"}
        onClose={closeModal}
        title="Create Task"
        subtitle="Deploy a new bounty into the board with hot-bounty and source-link controls."
      >
        <form onSubmit={submitTask} className="space-y-4 px-5 py-5 sm:px-6">
          <div>
            <label className="block text-sm font-medium text-zinc-100">Title</label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
              required
              className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-100">Description</label>
            <textarea
              value={taskForm.description}
              onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}
              rows={7}
              required
              className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-zinc-100">Category</label>
              <select
                value={taskForm.category}
                onChange={(event) => setTaskForm({ ...taskForm, category: event.target.value as (typeof TASK_CATEGORIES)[number] })}
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
              >
                {TASK_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100">Base Points</label>
              <input
                type="number"
                min="0"
                value={taskForm.basePoints}
                onChange={(event) => setTaskForm({ ...taskForm, basePoints: event.target.value })}
                required
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
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
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-sm border border-neutral-800 bg-neutral-950/40 px-4 py-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">
                Hot Bounty
              </p>
              <p className="mt-2 text-sm text-neutral-500">Glow this task in the hot bounty feed.</p>
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
            <label className="block text-sm font-medium text-zinc-100">SYSTEM_LINK / SOURCE</label>
            <input
              type="url"
              value={taskForm.repoUrl}
              onChange={(event) => setTaskForm({ ...taskForm, repoUrl: event.target.value })}
              className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
            />
          </div>

          <div className="rounded-sm border border-lime-400/20 bg-lime-400/10 px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime-300">
              Effective Points
            </p>
            <p className="mt-2 text-2xl font-semibold text-lime-200">
              {(
                Number.parseFloat(taskForm.basePoints || "0") *
                Number.parseFloat(taskForm.multiplier || "1")
              ).toLocaleString("en-US")}
            </p>
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting === "task"}
            className="inline-flex items-center gap-2 rounded-sm bg-lime-400 px-5 py-3 text-sm font-semibold uppercase text-black transition hover:bg-lime-300 disabled:opacity-60"
          >
            {submitting === "task" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            CREATE_TASK
          </button>
        </form>
      </TaskModalShell>

      <TaskModalShell
        open={openModal === "course"}
        onClose={closeModal}
        title="Create Course"
        subtitle="Ingest a new DLI module with launch URL, stock count, and XP cost."
      >
        <form onSubmit={submitCourse} className="space-y-4 px-5 py-5 sm:px-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-100">Title</label>
              <input
                type="text"
                value={courseForm.title}
                onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })}
                required
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100">Provider</label>
              <input
                type="text"
                value={courseForm.provider}
                onChange={(event) => setCourseForm({ ...courseForm, provider: event.target.value })}
                required
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100">Level</label>
              <select
                value={courseForm.level}
                onChange={(event) => setCourseForm({ ...courseForm, level: event.target.value })}
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
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
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100">Image URL</label>
              <input
                type="url"
                value={courseForm.imageUrl}
                onChange={(event) => setCourseForm({ ...courseForm, imageUrl: event.target.value })}
                required
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100">Course URL</label>
              <input
                type="url"
                value={courseForm.courseUrl}
                onChange={(event) => setCourseForm({ ...courseForm, courseUrl: event.target.value })}
                required
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
              />
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
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting === "course"}
            className="inline-flex items-center gap-2 rounded-sm bg-lime-400 px-5 py-3 text-sm font-semibold uppercase text-black transition hover:bg-lime-300 disabled:opacity-60"
          >
            {submitting === "course" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldPlus className="h-4 w-4" />
            )}
            CREATE_COURSE
          </button>
        </form>
      </TaskModalShell>

      <TaskModalShell
        open={openModal === "account"}
        onClose={closeModal}
        title="Account Creator"
        subtitle="Manually onboard a node and reveal the generated temporary password."
      >
        <form onSubmit={submitAccount} className="space-y-4 px-5 py-5 sm:px-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-100">Name</label>
              <input
                type="text"
                value={accountForm.name}
                onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })}
                required
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100">Email</label>
              <input
                type="email"
                value={accountForm.email}
                onChange={(event) => setAccountForm({ ...accountForm, email: event.target.value })}
                required
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100">SRM Reg No</label>
              <input
                type="text"
                value={accountForm.srmRegNo}
                onChange={(event) => setAccountForm({ ...accountForm, srmRegNo: event.target.value })}
                required
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100">Role</label>
              <select
                value={accountForm.role}
                onChange={(event) => setAccountForm({ ...accountForm, role: event.target.value })}
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
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
              value={accountForm.password}
              onChange={(event) =>
                setAccountForm({ ...accountForm, password: event.target.value })
              }
              placeholder="Leave blank to auto-generate"
              className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100 placeholder-neutral-600"
            />
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting === "account"}
            className="inline-flex items-center gap-2 rounded-sm bg-lime-400 px-5 py-3 text-sm font-semibold uppercase text-black transition hover:bg-lime-300 disabled:opacity-60"
          >
            {submitting === "account" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            ACCOUNT_CREATOR
          </button>
        </form>
      </TaskModalShell>

      <CustomPointsModal
        open={userRole === "admin" && openModal === "custom-points"}
        onClose={closeModal}
        onSubmit={submitCustomPoints}
        users={members}
        loading={membersLoading}
        submitting={submitting === "custom-points"}
        error={error}
      />
    </>
  );
}
