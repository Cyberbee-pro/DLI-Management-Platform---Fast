import { ArrowRight, ListTree } from "lucide-react";

import { DifficultyMeter } from "./difficulty-meter";
import { formatTaskId, getTaskTag, isTaskClaimed } from "./task-utils";
import type { TaskRecord } from "./types";

export function TaskQueue({
  tasks,
  loading,
  onInspect,
}: {
  tasks: TaskRecord[];
  loading: boolean;
  onInspect?: (task: TaskRecord) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <ListTree className="h-5 w-5 text-lime-300" />
        <h2 className="text-lg font-semibold uppercase tracking-[0.08em] text-zinc-50">
          Task Queue
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-lime-400/35 to-transparent" />
      </div>

      <div className="overflow-hidden rounded-sm border border-neutral-800">
        
        {/* DESKTOP HEADER (Hidden on smaller screens) */}
        <div className="hidden lg:grid grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_auto] gap-4 bg-white/[0.03] px-6 py-4 border-b border-neutral-800">
          {["Task Descriptor", "System / Tag", "Difficulty", "Yield", "Action"].map((label) => (
            <p key={label} className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
              {label}
            </p>
          ))}
        </div>

        {loading ? (
          <div className="px-6 py-8 text-sm text-zinc-500">
            Syncing task queue from the live endpoint...
          </div>
        ) : tasks.length === 0 ? (
          <div className="px-6 py-8 text-sm text-zinc-500">
            No non-hot tasks match the active filter.
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {tasks.map((task) => (
              <article
                key={task._id}
                
                className="flex flex-col gap-5 px-6 py-5 transition hover:bg-neutral-900/40 lg:grid lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_auto] lg:items-center lg:gap-4"
              >
                
                {/* 1. Title & ID */}
                <div className="min-w-0 pr-0 lg:pr-4">
                  <div className="flex items-center gap-2">
                    {isTaskClaimed(task) ? (
                      <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.7)] animate-pulse" />
                    ) : null}
                    <h3 className="text-base font-semibold tracking-tight text-zinc-100 truncate">
                      {task.title}
                    </h3>
                  </div>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                    {isTaskClaimed(task) ? "CLAIMED NODE ACTIVE" : "OPEN FOR CLAIM"}
                  </p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">
                    ID: {formatTaskId(task._id)}
                  </p>
                </div>

                {/* 2. Tags */}
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <span className="rounded-sm border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-xs uppercase tracking-[0.22em] text-zinc-300">
                    {getTaskTag(task)}
                  </span>
                  <span className="rounded-sm border border-neutral-800 bg-black/40 px-3 py-2 font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">
                    {task.category}
                  </span>
                </div>

                {/* 3. MOBILE ONLY: Split row for Difficulty and Yield */}
                <div className="flex items-center justify-between lg:hidden border-t border-neutral-800/50 pt-4">
                  <div className="whitespace-nowrap">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2">Difficulty</p>
                    <DifficultyMeter difficulty={task.difficulty} />
                  </div>
                  <div className="whitespace-nowrap text-right">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500 mb-2">
                      Points Available
                    </p>
                    <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-zinc-100">
                      {task.points.effective.toLocaleString()}
                      <span className="ml-2 text-lime-300">XP</span>
                    </p>
                  </div>
                </div>

                {/* 4. DESKTOP ONLY: Difficulty Column */}
                <div className="hidden whitespace-nowrap lg:block">
                  <DifficultyMeter difficulty={task.difficulty} />
                </div>

                {/* 5. DESKTOP ONLY: Yield Column */}
                <div className="hidden whitespace-nowrap lg:block">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                    Points Available
                  </p>
                  <p className="mt-2 font-mono text-sm font-semibold uppercase tracking-[0.14em] text-zinc-100">
                    {task.points.effective.toLocaleString()}
                    <span className="ml-2 text-lime-300">XP</span>
                  </p>
                </div>

                {/* 6. Action Button */}
                <div className="mt-2 flex justify-end lg:mt-0">
                  <button
                    type="button"
                    onClick={() => onInspect?.(task)}
                    // w-full on mobile, auto width on desktop
                    className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-neutral-800 bg-black/30 px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-lime-300 transition hover:border-lime-400/30 hover:bg-lime-400/10 whitespace-nowrap lg:w-auto"
                  >
                    Investigate
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}