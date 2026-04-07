"use client";

import { useRef, useState } from "react";
import { ChevronDown, FileUp, Link2, UploadCloud } from "lucide-react";

import type { TaskRecord } from "./types";

function formatTaskOption(task: TaskRecord) {
  return `${task.title} · ${task._id.slice(-6).toUpperCase()}`;
}

export function ProofOfWorkPanel({
  claimedTasks,
  loading,
}: {
  claimedTasks: TaskRecord[];
  loading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const resolvedTaskId = claimedTasks.some((task) => task._id === selectedTaskId)
    ? selectedTaskId
    : claimedTasks[0]?._id ?? "";

  function updateSelectedFiles(files: FileList | null) {
    if (!files) {
      return;
    }

    setSelectedFiles(Array.from(files));
  }

  return (
    <article className="panel-surface rounded-sm border border-neutral-800 p-5">
      <div className="flex items-center gap-3">
        <FileUp className="h-4 w-4 text-lime-300" />
        <h2 className="text-lg font-semibold uppercase tracking-[0.08em] text-zinc-50">
          Proof Of Work Submission
        </h2>
      </div>

      <form
        className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(260px,0.9fr)]"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
              Active Task ID
            </span>

            <div className="relative">
              <select
                value={resolvedTaskId}
                onChange={(event) => setSelectedTaskId(event.target.value)}
                disabled={loading || claimedTasks.length === 0}
                className="w-full appearance-none rounded-sm border border-neutral-800 bg-black/40 px-4 py-3 pr-10 font-mono text-sm uppercase tracking-[0.12em] text-zinc-100 outline-none transition focus:border-lime-400"
              >
                <option value="">
                  {loading
                    ? "Loading claimed tasks..."
                    : claimedTasks.length > 0
                      ? "Select active task"
                      : "No claimed tasks available"}
                </option>
                {claimedTasks.map((task) => (
                  <option key={task._id} value={task._id}>
                    {formatTaskOption(task)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-300" />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
              Submission URL
            </span>
            <div className="flex items-center gap-3 rounded-sm border border-neutral-800 bg-black/30 px-4 py-3 text-zinc-400 transition focus-within:border-lime-400">
              <Link2 className="h-4 w-4 text-lime-300" />
              <input
                type="url"
                value={submissionUrl}
                onChange={(event) => setSubmissionUrl(event.target.value)}
                placeholder="https://github.com/your-repo/pull/1"
                className="w-full bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
              />
            </div>
          </label>

          <p className="text-sm leading-6 text-zinc-500">
            {claimedTasks.length > 0
              ? "Select a claimed task and attach proof artifacts before deployment."
              : "Claimed tasks will appear here once the live task feed includes work assigned to this user."}
          </p>
        </div>

        <div className="space-y-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragActive(false);
              updateSelectedFiles(event.dataTransfer.files);
            }}
            className={[
              "grid min-h-52 place-items-center rounded-sm border border-dashed p-6 text-center transition-colors",
              isDragActive
                ? "border-lime-400 bg-lime-400/5"
                : "border-neutral-800 bg-black/30 hover:border-lime-400/35",
            ].join(" ")}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => updateSelectedFiles(event.target.files)}
            />

            <div>
              <UploadCloud className="mx-auto h-6 w-6 text-lime-300" />
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.24em] text-zinc-300">
                Drop Build Artifacts Here
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Click to browse or drag files into the node intake zone.
              </p>
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-zinc-600">
                Max size: 128MB (PDF, ZIP, TAR)
              </p>
            </div>
          </div>

          <div className="min-h-10 rounded-sm border border-neutral-800 bg-black/20 px-4 py-3">
            {selectedFiles.length > 0 ? (
              <div className="space-y-1">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-lime-300">
                  {selectedFiles.length} file(s) queued
                </p>
                {selectedFiles.slice(0, 3).map((file) => (
                  <p key={file.name} className="truncate text-sm text-zinc-400">
                    {file.name}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No artifacts selected yet.</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-sm bg-lime-400 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-black transition hover:bg-lime-300"
          >
            Deploy Submission
          </button>
        </div>
      </form>
    </article>
  );
}
