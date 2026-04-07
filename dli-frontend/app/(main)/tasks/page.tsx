"use client";

import { useEffect, useState } from "react";
import { Flame, LoaderCircle, SlidersHorizontal, Wifi } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  API_BASE_URL,
  OPERATOR_PROFILE,
  TASK_CATEGORIES,
  TASK_SORT_OPTIONS,
  type TaskCategory,
  type TaskSortOption,
} from "@/config/constants";
import { HotBountyCard } from "@/components/task-board/hot-bounty-card";
import { ProofOfWorkPanel } from "@/components/task-board/proof-of-work-panel";
import { TaskQueue } from "@/components/task-board/task-queue";
import type { TaskRecord, TasksApiResponse } from "@/components/task-board/types";

const ALL_TASKS_FILTER = "All Tasks";
const TASK_FILTER_OPTIONS = [ALL_TASKS_FILTER, ...TASK_CATEGORIES] as const;

function buildTaskEndpoint() {
  const sanitizedBaseUrl = API_BASE_URL.replace(/\/$/, "");
  return sanitizedBaseUrl ? `${sanitizedBaseUrl}/tasks` : "";
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
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<typeof ALL_TASKS_FILTER | TaskCategory>(ALL_TASKS_FILTER);
  const [sortBy, setSortBy] = useState<TaskSortOption>(TASK_SORT_OPTIONS[0]);

  useEffect(() => {
    const token = window.localStorage.getItem("token");
    const taskEndpoint = buildTaskEndpoint();
    let isCancelled = false;

    if (!token) {
      router.push("/login");
      return;
    }

    async function loadTasks() {
      if (!taskEndpoint) {
        if (!isCancelled) {
          setError("NEXT_PUBLIC_API_URL is not configured, so the live task feed cannot load.");
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(taskEndpoint, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json().catch(() => null)) as TasksApiResponse | null;

        if (!response.ok) {
          if (response.status === 401) {
            window.localStorage.removeItem("token");
            router.push("/login");
            return;
          }

          throw new Error(payload?.message ?? `Failed to load tasks (${response.status}).`);
        }

        const nextTasks = Array.isArray(payload?.data) ? payload.data : [];

        if (!isCancelled) {
          setTasks(nextTasks);
        }
      } catch (fetchError) {
        if (!isCancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "An unexpected error occurred while loading tasks.",
          );
          setTasks([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadTasks();

    return () => {
      isCancelled = true;
    };
  }, [router]);

  const activeTasks = tasks.filter((task) => task.status !== "completed");
  const categoryFilteredTasks =
    selectedCategory === ALL_TASKS_FILTER
      ? activeTasks
      : activeTasks.filter((task) => task.category === selectedCategory);

  const hotBounties = sortTasks(
    categoryFilteredTasks.filter((task) => task.isHotBounty),
    sortBy,
  );
  const queuedTasks = sortTasks(
    categoryFilteredTasks.filter((task) => !task.isHotBounty),
    sortBy,
  );
  const claimedTasks = sortTasks(
    tasks.filter((task) => task.status === "claimed"),
    sortBy,
  );

  const activeTaskCount = activeTasks.length;
  const hotTaskCount = activeTasks.filter((task) => task.isHotBounty).length;
  const claimedTaskCount = claimedTasks.length;
  const liveYield = activeTasks.reduce((sum, task) => sum + task.points.effective, 0);

  return (
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
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              Tactical access to live bounties, queue depth, and submission pipelines for the{" "}
              {OPERATOR_PROFILE.handle.toLowerCase().replace("_", " ")} node.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-neutral-800 bg-neutral-950 px-4 py-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">
                Hot Bounties
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-zinc-100">
                {hotTaskCount.toString().padStart(2, "0")}
              </p>
            </div>
            <div className="rounded-sm border border-neutral-800 bg-neutral-950 px-4 py-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">
                Claimed Tasks
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-lime-300">
                {claimedTaskCount.toString().padStart(2, "0")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-neutral-800 pt-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
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
                    ? "border-lime-400/35 bg-lime-400/10 text-lime-300"
                    : "border-neutral-800 bg-black/20 text-zinc-500 hover:text-zinc-100",
                ].join(" ")}
              >
                {filter}
              </button>
            ))}
          </div>

          <label className="inline-flex items-center gap-3 rounded-sm border border-neutral-800 bg-black/20 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.22em] text-zinc-300">
            <SlidersHorizontal className="h-4 w-4 text-lime-300" />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as TaskSortOption)}
              className="bg-transparent text-xs uppercase tracking-[0.22em] text-lime-300 outline-none"
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
          <Flame className="h-5 w-5 text-lime-300" />
          <h2 className="text-lg font-semibold uppercase tracking-[0.08em] text-zinc-50">
            Hot Bounties
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-lime-400/35 to-transparent" />
        </div>

        {loading ? (
          <div className="panel-surface flex items-center gap-3 rounded-sm border border-neutral-800 px-5 py-5 text-sm text-zinc-400">
            <LoaderCircle className="h-4 w-4 animate-spin text-lime-300" />
            Syncing live hot bounty feed...
          </div>
        ) : hotBounties.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {hotBounties.map((task) => (
              <HotBountyCard key={task._id} task={task} />
            ))}
          </div>
        ) : (
          <div className="panel-surface rounded-sm border border-neutral-800 px-5 py-5 text-sm text-zinc-500">
            No hot bounties match the current filter.
          </div>
        )}
      </section>

      <TaskQueue tasks={queuedTasks} loading={loading} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.83fr)]">
        <ProofOfWorkPanel claimedTasks={claimedTasks} loading={loading} />

        <article className="panel-surface rounded-sm border border-neutral-800 p-5">
          <div className="flex items-center gap-3">
            <Wifi className="h-5 w-5 text-lime-300" />
            <h2 className="text-lg font-semibold uppercase tracking-[0.08em] text-zinc-50">
              Node Status
            </h2>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
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
                    width: `${Math.min(100, Math.max(18, activeTaskCount * 12))}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-neutral-800 pt-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
                    Live Yield
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-zinc-50">
                    {liveYield.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
                    Claimed
                  </p>
                  <p className="mt-2 font-mono text-xl font-semibold text-lime-300">
                    {claimedTaskCount.toString().padStart(2, "0")}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-6 text-zinc-400">
                {hotTaskCount} hot bounty node(s) currently active in the live feed. Completed
                work is excluded from this queue view.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
