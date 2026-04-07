import { ClipboardCheck, Flame, Link2, SlidersHorizontal, Wifi } from "lucide-react";

import {
  HOT_BOUNTIES,
  OPERATOR_PROFILE,
  TASK_BOARD_SUMMARY,
  TASK_FILTERS,
  TASK_SORT_OPTIONS,
} from "@/config/constants";
import { HotBountyCard } from "@/components/task-board/hot-bounty-card";
import { TaskQueue } from "@/components/task-board/task-queue";

export default function TaskBoardPage() {
  return (
    <div className="space-y-8 pb-4">
      <section className="panel-surface rounded-sm border border-[color:var(--line)] px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-lime-300">
              Direct Liaison Interface / Active Node
            </p>
            <h1 className="mt-4 text-5xl font-semibold uppercase leading-none tracking-tight text-zinc-50 sm:text-7xl">
              Task <span className="text-lime-400">Board</span>
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-400">
              Tactical access to live bounties, queue depth, and submission pipelines for
              the {` `}
              {OPERATOR_PROFILE.handle.toLowerCase().replace("_", " ")} node.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-lime-400/20 bg-lime-400/10 px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                Active Bounties
              </p>
              <p className="mt-3 text-4xl font-semibold text-zinc-50">
                {TASK_BOARD_SUMMARY.activeBounties.toString().padStart(2, "0")}
              </p>
            </div>
            <div className="rounded-sm border border-white/8 bg-white/[0.03] px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                Current Rank
              </p>
              <p className="mt-3 text-4xl font-semibold text-lime-300">
                {TASK_BOARD_SUMMARY.currentRank}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-[color:var(--line)] pt-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.34em] text-zinc-500">
              Filter By:
            </span>

            {TASK_FILTERS.map((filter, index) => (
              <button
                key={filter}
                type="button"
                className={[
                  "rounded-sm border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.3em] transition",
                  index === 0
                    ? "border-lime-400/35 bg-lime-400/10 text-lime-300"
                    : "border-white/8 bg-white/[0.02] text-zinc-400 hover:text-zinc-100",
                ].join(" ")}
              >
                {filter}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-3 rounded-sm border border-white/8 bg-white/[0.04] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-300"
          >
            <SlidersHorizontal className="h-4 w-4 text-lime-300" />
            Sort: {TASK_SORT_OPTIONS[0]}
          </button>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <Flame className="h-5 w-5 text-lime-300" />
          <h2 className="text-4xl font-semibold uppercase tracking-tight text-zinc-50">
            Hot Bounties
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-lime-400/35 to-transparent" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {HOT_BOUNTIES.map((bounty) => (
            <HotBountyCard key={bounty.id} bounty={bounty} />
          ))}
        </div>
      </section>

      <TaskQueue />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.83fr)]">
        <article className="panel-surface rounded-sm border border-[color:var(--line)] p-6">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-lime-300" />
            <h2 className="text-3xl font-semibold uppercase tracking-tight text-zinc-50">
              Proof Of Work Submission
            </h2>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(260px,0.9fr)]">
            <div className="space-y-6">
              <label className="block space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">
                  Active Task ID
                </span>
                <div className="rounded-sm border border-lime-400/20 bg-black/40 px-4 py-4 font-mono text-sm uppercase tracking-[0.18em] text-lime-300">
                  {TASK_BOARD_SUMMARY.activeTaskId}
                </div>
              </label>

              <label className="block space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">
                  Submission URL / Link
                </span>
                <div className="flex items-center gap-3 rounded-sm border border-white/8 bg-white/[0.04] px-4 py-4 text-zinc-400">
                  <Link2 className="h-4 w-4 text-lime-300" />
                  <input
                    type="url"
                    placeholder="https://github.com/your-repo/submission"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"
                  />
                </div>
              </label>
            </div>

            <div className="space-y-5">
              <div className="grid min-h-56 place-items-center rounded-sm border border-dashed border-lime-400/20 bg-black/30 p-6 text-center">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.32em] text-zinc-500">
                    Drop Build Artifacts Here
                  </p>
                  <p className="mt-3 text-sm text-zinc-400">
                    Max size: 128MB (PDF, ZIP, TAR)
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="w-full rounded-sm bg-lime-400 px-5 py-4 font-mono text-sm font-semibold uppercase tracking-[0.24em] text-black transition hover:bg-lime-300"
              >
                Deploy Submission
              </button>
            </div>
          </div>
        </article>

        <article className="panel-surface rounded-sm border border-[color:var(--line)] p-6">
          <div className="flex items-center gap-3">
            <Wifi className="h-5 w-5 text-lime-300" />
            <h2 className="text-3xl font-semibold uppercase tracking-tight text-zinc-50">
              Node Status
            </h2>
          </div>

          <div className="mt-8 space-y-8">
            <div>
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">
                  Active Bounties
                </p>
                <p className="text-4xl font-semibold text-zinc-100">
                  {TASK_BOARD_SUMMARY.activeBounties.toString().padStart(2, "0")}
                </p>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/[0.08]">
                <div className="h-full w-[72%] rounded-full bg-lime-400 shadow-[0_0_16px_rgba(163,230,53,0.45)]" />
              </div>
            </div>

            <div className="space-y-4 border-t border-[color:var(--line)] pt-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">
                    Accrued DLI
                  </p>
                  <p className="mt-2 text-5xl font-semibold text-zinc-50">
                    {TASK_BOARD_SUMMARY.accruedDli}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">
                    System Rank
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-lime-300">
                    {TASK_BOARD_SUMMARY.currentRank}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-7 text-zinc-400">
                {TASK_BOARD_SUMMARY.distanceToNextRank}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 border-t border-[color:var(--line)] pt-6 font-mono text-[10px] uppercase tracking-[0.34em] text-zinc-500 sm:grid-cols-3">
        <p>
          Uptime
          <span className="mt-2 block text-sm tracking-[0.18em] text-zinc-200">
            {TASK_BOARD_SUMMARY.nodeUptime}
          </span>
        </p>
        <p>
          Network Latency
          <span className="mt-2 block text-sm tracking-[0.18em] text-lime-300">
            {TASK_BOARD_SUMMARY.networkLatency}
          </span>
        </p>
        <p>
          Protocol
          <span className="mt-2 block text-sm tracking-[0.18em] text-zinc-200">
            {TASK_BOARD_SUMMARY.protocol}
          </span>
        </p>
      </section>
    </div>
  );
}
