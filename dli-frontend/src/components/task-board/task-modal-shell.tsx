"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface TaskModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function TaskModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
}: TaskModalShellProps) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 px-4 py-6 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <section className="relative z-[71] flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-sm border border-neutral-800 bg-neutral-950 shadow-[0_24px_120px_rgba(0,0,0,0.65)]">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-800 px-5 py-5 sm:px-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
              Mission Intake
            </p>
            <h2 className="mt-2 text-xl font-semibold uppercase tracking-[0.04em] text-zinc-50">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-2 text-sm leading-6 text-neutral-400">{subtitle}</p>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-neutral-800 bg-black text-neutral-400 transition hover:border-lime-400/30 hover:text-lime-400"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}
