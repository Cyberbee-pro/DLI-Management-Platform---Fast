import { ArrowRight, ListTree } from "lucide-react";

import { TASK_QUEUE_ITEMS } from "@/config/constants";
import { DifficultyMeter } from "./difficulty-meter";

export function TaskQueue() {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <ListTree className="h-5 w-5 text-lime-300" />
        <h2 className="text-4xl font-semibold uppercase tracking-tight text-zinc-50">
          Task Queue
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-lime-400/35 to-transparent" />
      </div>

      <div className="overflow-hidden rounded-sm border border-[color:var(--line)]">
        <div className="hidden grid-cols-[minmax(0,1.8fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_auto] gap-4 bg-white/[0.03] px-7 py-5 lg:grid">
          {["Task Descriptor", "System / Tag", "Difficulty", "Yield", "Action"].map((label) => (
            <p key={label} className="font-mono text-[10px] uppercase tracking-[0.34em] text-zinc-500">
              {label}
            </p>
          ))}
        </div>

        <div className="divide-y divide-[color:var(--line)]">
          {TASK_QUEUE_ITEMS.map((task) => (
            <article
              key={task.id}
              className="grid gap-5 px-6 py-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_auto] lg:items-center"
            >
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-zinc-100">
                  {task.title}
                </h3>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-500">
                  ID: {task.id}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-sm border border-white/8 bg-white/[0.04] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-300">
                  {task.node}
                </span>
                <span className="rounded-sm border border-lime-400/20 bg-lime-400/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-lime-300">
                  {task.category}
                </span>
              </div>

              <DifficultyMeter difficulty={task.difficulty} />

              <div>
                <p className="text-3xl font-semibold tracking-tight text-zinc-100">
                  {task.reward.toLocaleString()}
                  <span className="ml-2 text-xl text-lime-300">DLI</span>
                </p>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-lime-400/20 bg-lime-400/10 px-4 py-3 font-mono text-xs uppercase tracking-[0.26em] text-lime-300 transition hover:border-lime-400/40 hover:bg-lime-400/15"
              >
                Investigate
                <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
