"use client";

import { useState } from "react";
import { Check, Loader2, MinusCircle, Sparkles } from "lucide-react";

import { TaskModalShell } from "@/components/task-board/task-modal-shell";
import type { CustomPointsRequest } from "@/lib/api";

export interface CustomPointsMemberOption {
  _id: string;
  name: string;
  srmRegNo: string;
  rank?: string;
}

interface CustomPointsModalProps {
  open: boolean;
  mode: "award" | "deduct";
  users: CustomPointsMemberOption[];
  loading?: boolean;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: CustomPointsRequest) => Promise<void>;
}

export function CustomPointsModal({
  open,
  mode,
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
  const totalPoints = Number.isFinite(numericPoints) ? selectedCount * numericPoints : 0;
  const canSubmit =
    !submitting &&
    !loading &&
    users.length > 0 &&
    selectedCount > 0 &&
    Number.isFinite(numericPoints) &&
    numericPoints > 0 &&
    reason.trim().length > 0;
  const isDeduction = mode === "deduct";
  const accentTextClass = isDeduction ? "text-rose-300" : "text-lime-300";
  const accentPanelClass = isDeduction
    ? "border-rose-400/20 bg-rose-400/10"
    : "border-lime-400/20 bg-lime-400/10";
  const submitButtonClass = isDeduction
    ? "bg-rose-500 text-white hover:bg-rose-400"
    : "bg-lime-400 text-black hover:bg-lime-300";
  const selectedBadgeClass = isDeduction
    ? "border-rose-400/20 bg-rose-400/10 text-rose-200"
    : "border-lime-400/20 bg-lime-400/10 text-lime-200";
  const selectedRowClass = isDeduction
    ? "border-rose-400/30 bg-rose-400/10 shadow-[0_0_24px_rgba(251,113,133,0.08)]"
    : "border-lime-400/30 bg-lime-400/10 shadow-[0_0_24px_rgba(163,230,53,0.08)]";
  const selectedCheckClass = isDeduction
    ? "border-rose-300 bg-rose-400 text-white"
    : "border-lime-300 bg-lime-400 text-black";
  const idleRowClass = isDeduction
    ? "border-neutral-800 bg-neutral-950 hover:border-rose-400/20"
    : "border-neutral-800 bg-neutral-950 hover:border-lime-400/20";

  return (
    <TaskModalShell
      open={open}
      onClose={handleClose}
      title={isDeduction ? "Deduct Points" : "Award Blank Points"}
      subtitle={
        isDeduction
          ? "Remove custom points from selected members with a required audit reason. This path is intentionally restricted to admin operators."
          : "Grant custom reward points for off-board work. This path is intentionally restricted to admin operators."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5 sm:px-6">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="space-y-4">
            <div className="rounded-sm border border-neutral-800 bg-black/60">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-4">
                <div>
                  <p className={`font-mono text-xs uppercase tracking-[0.22em] ${accentTextClass}`}>
                    Member Targets
                  </p>
                  <p className="mt-2 text-sm text-neutral-500">
                    {isDeduction
                      ? "Select one or more members for the deduction payload."
                      : "Select one or more members for the custom award payload."}
                  </p>
                </div>

                <div className={`rounded-sm border px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] ${selectedBadgeClass}`}>
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
                    {isDeduction
                      ? "No member accounts are currently available for point deductions."
                      : "No member accounts are currently available for custom point awards."}
                  </div>
                ) : (
                  users.map((user) => {
                    const selected = selectedUserIds.includes(user._id);

                    return (
                      <label
                        key={user._id}
                        className={`flex cursor-pointer items-center justify-between gap-4 rounded-sm border px-4 py-4 transition ${
                          selected
                            ? selectedRowClass
                            : idleRowClass
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
                              ? selectedCheckClass
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
              <label className="block text-sm font-medium text-zinc-100">
                {isDeduction ? "Points to Deduct" : "Points to Award"}
              </label>
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
                placeholder={
                  isDeduction
                    ? "Capture the correction, reversal, or compliance reason for this deduction."
                    : "Capture the unlisted task, context, or justification for this reward."
                }
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-black px-4 py-3 text-sm text-zinc-100 placeholder-neutral-600"
              />
            </div>

            <div className={`rounded-sm border p-4 ${accentPanelClass}`}>
              <p className={`font-mono text-xs uppercase tracking-[0.2em] ${accentTextClass}`}>
                {isDeduction ? "Deduction Preview" : "Dispatch Preview"}
              </p>
              <p className={`mt-3 text-2xl font-semibold ${isDeduction ? "text-rose-100" : "text-lime-100"}`}>
                {Number.isFinite(totalPoints) ? totalPoints.toLocaleString("en-US") : "0"} XP
              </p>
              <p className={`mt-2 text-sm ${isDeduction ? "text-rose-200/80" : "text-lime-200/80"}`}>
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
            className={`inline-flex items-center gap-2 rounded-sm px-5 py-3 text-sm font-semibold uppercase transition disabled:cursor-not-allowed disabled:opacity-60 ${submitButtonClass}`}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isDeduction ? (
              <MinusCircle className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {submitting
              ? isDeduction
                ? "DEDUCTING..."
                : "DISPATCHING..."
              : isDeduction
                ? "DEDUCT_POINTS"
                : "AWARD_BLANK_POINTS"}
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
