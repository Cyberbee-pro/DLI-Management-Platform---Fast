import { ArrowUpRight, Clock3 } from "lucide-react";

import { DifficultyMeter } from "./difficulty-meter";
import type { TaskRecord } from "./types";

function formatMultiplier(multiplier: number) {
  return `${multiplier.toFixed(1)}x multiplier`;
}

function formatDeadline(deadline?: string | null) {
  if (!deadline) {
    return "Open cycle";
  }

  const delta = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(delta) || delta <= 0) {
    return "Due now";
  }

  const totalHours = Math.floor(delta / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((delta % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function getTaskAccent(task: TaskRecord) {
  return task.tags[0]?.replace(/[-_]/g, " ") ?? task.category;
}

export function HotBountyCard({ task }: { task: TaskRecord }) {
  return (
    <article className="panel-surface relative overflow-hidden rounded-sm border border-neutral-800 p-5">
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-lime-400 via-lime-400/60 to-transparent" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-sm border border-neutral-800 bg-neutral-900 px-2.5 py-1 font-mono text-xs uppercase tracking-[0.22em] text-lime-300">
            {getTaskAccent(task)}
          </span>
          <span className="rounded-sm border border-neutral-800 bg-black/30 px-2.5 py-1 font-mono text-xs uppercase tracking-[0.22em] text-zinc-400">
            {formatMultiplier(task.points.multiplier)}
          </span>
        </div>

        <div className="text-right">
          <p className="font-mono text-2xl font-semibold tracking-tight text-lime-300">
            {task.points.effective.toLocaleString()}
          </p>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
            DLI Credits
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
          {task.category} / {task.status}
        </p>
        <h3 className="mt-2 max-w-xl text-xl font-semibold uppercase leading-tight tracking-tight text-zinc-50">
          {task.title}
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          {task.description}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-5 border-t border-neutral-800 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-4 sm:grid-cols-2">
          <DifficultyMeter difficulty={task.difficulty} />

          <div className="space-y-1.5">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
              Time Remaining
            </p>
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Clock3 className="h-3.5 w-3.5 text-lime-300" />
              <span className="font-mono uppercase tracking-[0.18em]">
                {formatDeadline(task.deadline)}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-lime-400 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-black transition hover:bg-lime-300"
        >
          Claim Task
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
