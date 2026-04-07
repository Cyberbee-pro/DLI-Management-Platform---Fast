import { ArrowRight, ListTree } from "lucide-react";

import { DifficultyMeter } from "./difficulty-meter";
import type { TaskRecord } from "./types";

function formatTaskId(taskId: string) {
  return taskId.slice(-8).toUpperCase();
}

function getTaskTag(task: TaskRecord) {
  return task.tags[0]?.replace(/[-_]/g, " ") ?? task.category;
}

export function TaskQueue({
  tasks,
  loading,
}: {
  tasks: TaskRecord[];
  loading: boolean;
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
        <div className="hidden grid-cols-[minmax(0,1.8fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_auto] gap-4 bg-white/[0.03] px-6 py-4 lg:grid">
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
                className="grid gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_auto] lg:items-center"
              >
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-zinc-100">
                    {task.title}
                  </h3>
                  <p className="mt-1 font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">
                    ID: {formatTaskId(task._id)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-sm border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-xs uppercase tracking-[0.22em] text-zinc-300">
                    {getTaskTag(task)}
                  </span>
                  <span className="rounded-sm border border-neutral-800 bg-black/40 px-3 py-2 font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">
                    {task.category}
                  </span>
                </div>

                <DifficultyMeter difficulty={task.difficulty} />

                <div>
                  <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-zinc-100">
                    {task.points.effective.toLocaleString()}
                    <span className="ml-2 text-lime-300">DLI</span>
                  </p>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-neutral-800 bg-black/30 px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-lime-300 transition hover:border-lime-400/30 hover:bg-lime-400/10"
                >
                  Investigate
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
