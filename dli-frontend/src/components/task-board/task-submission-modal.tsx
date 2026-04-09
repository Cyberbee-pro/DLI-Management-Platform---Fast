"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { File, Image as ImageIcon, Loader2, Send, UploadCloud } from "lucide-react";

import { TaskModalShell } from "./task-modal-shell";
import type { TaskRecord } from "./types";

interface SubmissionDraft {
  fileUrl: string;
  comment: string;
  selectedFile: File | null;
}

interface TaskSubmissionModalProps {
  open: boolean;
  task: TaskRecord | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (task: TaskRecord, draft: SubmissionDraft) => void;
}

export function TaskSubmissionModal({
  open,
  task,
  submitting = false,
  onClose,
  onSubmit,
}: TaskSubmissionModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileUrl, setFileUrl] = useState(task?.submissionDetails?.url ?? "");
  const [comment, setComment] = useState(task?.submissionDetails?.comment ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!task) {
    return null;
  }

  const hasExistingSubmission = Boolean(task.submissionDetails?.url);

  function updateSelectedFile(file: File | null) {
    setSelectedFile(file);
  }

  return (
    <TaskModalShell
      open={open}
      onClose={onClose}
      title={`${hasExistingSubmission ? "Edit" : "Submit"} ${task.title}`}
      subtitle="Attach a proof artifact for preview, then store the final submission URL with an operator note."
    >
      <form
        className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)]"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(task, {
            fileUrl,
            comment,
            selectedFile,
          });
        }}
      >
        <section className="space-y-5">
          <label className="block space-y-2">
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
              Artifact URL
            </span>
            <input
              type="url"
              required
              value={fileUrl}
              onChange={(event) => setFileUrl(event.target.value)}
              placeholder="https://github.com/org/repo/pull/42"
              className="w-full rounded-sm border border-neutral-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-lime-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
              Comment
            </span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={6}
              placeholder="Deployment notes, review context, or file manifest..."
              className="w-full rounded-sm border border-neutral-800 bg-black px-4 py-3 text-sm leading-6 text-zinc-100 outline-none transition focus:border-lime-400"
            />
          </label>

          <p className="text-sm leading-6 text-neutral-500">
            Local file selection is used for preview so the operator can verify the correct artifact
            before submitting the final hosted URL.
          </p>
        </section>

        <section className="space-y-4">
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
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              updateSelectedFile(event.dataTransfer.files[0] ?? null);
            }}
            className={[
              "grid min-h-56 place-items-center rounded-sm border border-dashed p-6 text-center transition",
              dragActive
                ? "border-lime-400 bg-lime-400/5"
                : "border-neutral-800 bg-black/40 hover:border-lime-400/30",
            ].join(" ")}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => updateSelectedFile(event.target.files?.[0] ?? null)}
            />

            <div>
              <UploadCloud className="mx-auto h-6 w-6 text-lime-300" />
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.22em] text-zinc-100">
                Select Preview Artifact
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Drop a file here or click to load a local preview before submission.
              </p>
            </div>
          </div>

          <div className="rounded-sm border border-neutral-800 bg-black px-4 py-4">
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime-300">
                      Preview Ready
                    </p>
                    <p className="mt-1 truncate text-sm text-zinc-100">{selectedFile.name}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  {selectedFile.type.startsWith("image/") ? (
                    <ImageIcon className="h-5 w-5 shrink-0 text-lime-300" />
                  ) : (
                    <File className="h-5 w-5 shrink-0 text-lime-300" />
                  )}
                </div>

                {previewUrl && selectedFile.type.startsWith("image/") ? (
                  <Image
                    src={previewUrl}
                    alt={selectedFile.name}
                    width={640}
                    height={240}
                    unoptimized
                    className="max-h-40 w-full rounded-sm border border-neutral-800 object-cover"
                  />
                ) : previewUrl ? (
                  <div className="flex items-center gap-3 rounded-sm border border-neutral-800 bg-neutral-900/40 px-4 py-4 text-sm text-neutral-300">
                    <File className="h-5 w-5 text-lime-300" />
                    <span>Binary artifact loaded and ready for preview validation.</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No local artifact selected yet.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-lime-400 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting
              ? "LOADING..."
              : hasExistingSubmission
                ? "UPDATE SUBMISSION"
                : "SUBMIT TASK"}
          </button>
        </section>
      </form>
    </TaskModalShell>
  );
}
