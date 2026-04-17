"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";

import { TaskModalShell } from "@/components/task-board/task-modal-shell";
import type { AwardCustomPointsRequest } from "@/lib/api";

export interface CustomPointsMemberOption {
  _id: string;
  name: string;
  srmRegNo: string;
  rank?: string;
}

interface CustomPointsModalProps {
  open: boolean;
  users: CustomPointsMemberOption[];
  loading?: boolean;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: AwardCustomPointsRequest) => Promise<void>;
}

export function CustomPointsModal({
  open,
  users,
  loading = false,
  submitting = false,
  error = null,
  onClose,
  onSubmit,
}: CustomPointsModalProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");

  function handleClose() {
    setSelectedUserIds([]);
    setPoints("");
    setReason("");
    onClose();
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((currentUserIds) =>
      currentUserIds.includes(userId)
        ? currentUserIds.filter((currentUserId) => currentUserId !== userId)
        : [...currentUserIds, userId],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      userIds: selectedUserIds,
      points: Number.parseFloat(points),
      reason: reason.trim(),
    });
  }

  const selectedCount = selectedUserIds.length;
  const numericPoints = Number.parseFloat(points || "0");
  const totalAward = Number.isFinite(numericPoints) ? selectedCount * numericPoints : 0;
  const canSubmit =
    !submitting &&
    !loading &&
    users.length > 0 &&
    selectedCount > 0 &&
    Number.isFinite(numericPoints) &&
    numericPoints > 0 &&
    reason.trim().length > 0;

  return (
    <TaskModalShell
      open={open}
      onClose={handleClose}
      title="Award Blank Points"
      subtitle="Grant custom reward points for off-board work. This path is intentionally restricted to admin operators."
    >
      <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5 sm:px-6">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="space-y-4">
            <div className="rounded-sm border border-neutral-800 bg-black/60">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-lime-300">
                    Member Targets
                  </p>
                  <p className="mt-2 text-sm text-neutral-500">
                    Select one or more members for the custom award payload.
                  </p>
                </div>

                <div className="rounded-sm border border-lime-400/20 bg-lime-400/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-lime-200">
                  {selectedCount.toString().padStart(2, "0")} selected
                </div>
              </div>

              <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
                {loading ? (
                  <div className="flex items-center gap-3 rounded-sm border border-neutral-800 bg-neutral-950 px-4 py-4 text-sm text-neutral-400">
                    <Loader2 className="h-4 w-4 animate-spin text-lime-300" />
                    Syncing member registry...
                  </div>
                ) : users.length === 0 ? (
                  <div className="rounded-sm border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-200">
                    No member accounts are currently available for custom point awards.
                  </div>
                ) : (
                  users.map((user) => {
                    const selected = selectedUserIds.includes(user._id);

                    return (
                      <label
                        key={user._id}
                        className={`flex cursor-pointer items-center justify-between gap-4 rounded-sm border px-4 py-4 transition ${
                          selected
                            ? "border-lime-400/30 bg-lime-400/10 shadow-[0_0_24px_rgba(163,230,53,0.08)]"
                            : "border-neutral-800 bg-neutral-950 hover:border-lime-400/20"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-100">{user.name}</p>
                          <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
                            {user.srmRegNo}
                            {user.rank ? ` / ${user.rank}` : ""}
                          </p>
                        </div>

                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-sm border ${
                            selected
                              ? "border-lime-300 bg-lime-400 text-black"
                              : "border-neutral-700 bg-black text-transparent"
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </span>

                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleUser(user._id)}
                          className="sr-only"
                        />
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-sm border border-neutral-800 bg-black/60 p-4">
              <label className="block text-sm font-medium text-zinc-100">Points to Award</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={points}
                onChange={(event) => setPoints(event.target.value)}
                required
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-2 text-sm text-zinc-100"
              />
            </div>

            <div className="rounded-sm border border-neutral-800 bg-black/60 p-4">
              <label className="block text-sm font-medium text-zinc-100">Reason / Comment</label>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={6}
                required
                placeholder="Capture the unlisted task, context, or justification for this reward."
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-3 text-sm text-zinc-100 placeholder-neutral-600"
              />
            </div>

            <div className="rounded-sm border border-lime-400/20 bg-lime-400/10 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime-300">
                Dispatch Preview
              </p>
              <p className="mt-3 text-2xl font-semibold text-lime-100">
                {Number.isFinite(totalAward) ? totalAward.toLocaleString("en-US") : "0"} XP
              </p>
              <p className="mt-2 text-sm text-lime-200/80">
                {selectedCount} member{selectedCount === 1 ? "" : "s"} x{" "}
                {Number.isFinite(numericPoints) ? numericPoints.toLocaleString("en-US") : "0"} XP
              </p>
            </div>
          </aside>
        </section>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="flex flex-wrap gap-3 border-t border-neutral-800 pt-5">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-sm bg-lime-400 px-5 py-3 text-sm font-semibold uppercase text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {submitting ? "DISPATCHING..." : "AWARD_BLANK_POINTS"}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center justify-center rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-neutral-400 transition hover:text-zinc-100"
          >
            CANCEL
          </button>
        </div>
      </form>
    </TaskModalShell>
  );
}
