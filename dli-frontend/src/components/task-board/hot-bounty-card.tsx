import { ArrowUpRight, Clock3 } from "lucide-react";

import type { HotBounty } from "@/config/constants";
import { DifficultyMeter } from "./difficulty-meter";

export function HotBountyCard({ bounty }: { bounty: HotBounty }) {
  return (
    <article className="panel-surface relative overflow-hidden rounded-sm border border-[color:var(--line)] p-6">
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-lime-300 via-lime-400 to-transparent" />

      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-sm border border-lime-400/25 bg-lime-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.28em] text-lime-300">
            {bounty.emphasis}
          </span>
          <span className="rounded-sm border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.28em] text-fuchsia-200">
            {bounty.multiplier}
          </span>
        </div>

        <div className="text-right">
          <p className="text-5xl font-semibold tracking-tight text-lime-300">
            {bounty.reward.toLocaleString()}
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">
            DLI Credits
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">
          {bounty.category} Bounty
        </p>
        <h3 className="mt-3 max-w-xl text-4xl font-semibold uppercase leading-none tracking-tight text-zinc-50">
          {bounty.title}
        </h3>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
          {bounty.description}
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-6 border-t border-[color:var(--line)] pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-5 sm:grid-cols-2">
          <DifficultyMeter difficulty={bounty.difficulty} />

          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              Time Remaining
            </p>
            <div className="flex items-center gap-2 text-sm font-medium tracking-[0.18em] text-rose-200">
              <Clock3 className="h-4 w-4" />
              <span className="font-mono uppercase">{bounty.timeRemaining}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-lime-400 px-6 py-4 font-mono text-sm font-semibold uppercase tracking-[0.24em] text-black transition hover:bg-lime-300"
        >
          Claim Task
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
