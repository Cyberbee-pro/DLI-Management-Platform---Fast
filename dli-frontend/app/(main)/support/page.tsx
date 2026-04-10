"use client";

import { useState } from "react";
import { AlertTriangle, Headset, Loader2, ShieldAlert } from "lucide-react";

import { API_BASE_URL } from "@/config/constants";

type SupportType = "ANOMALY_REPORTING" | "ADMIN_ASSISTANCE";

export default function SupportPage() {
  const [form, setForm] = useState({
    type: "ANOMALY_REPORTING" as SupportType,
    subject: "",
    contactEmail: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const token = window.localStorage.getItem("token");

    if (!token) {
      setError("Authentication session missing.");
      return;
    }

    setSubmitting(true);
    setSuccessMessage(null);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/support`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: form.type,
          subject: form.subject.trim() || undefined,
          contactEmail: form.contactEmail.trim() || undefined,
          message: form.message.trim(),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to submit support request.");
      }

      setForm({
        type: "ANOMALY_REPORTING",
        subject: "",
        contactEmail: "",
        message: "",
      });
      setSuccessMessage("SUPPORT_REQUEST_TRANSMITTED");
    } catch (supportError) {
      setError(
        supportError instanceof Error
          ? supportError.message
          : "Failed to submit support request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-4">
      <section className="rounded-sm border border-neutral-800 bg-black px-5 py-6 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-400">
          Support Node
        </p>
        <h1 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-zinc-50 sm:text-4xl">
          Terminal <span className="text-white">Support</span>
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
          Transmit anomaly reports and admin assistance requests through a dedicated monochromatic
          command panel.
        </p>
      </section>

      {successMessage ? (
        <section className="rounded-sm border border-lime-400/20 bg-lime-400/10 px-4 py-4 text-sm text-lime-200">
          {successMessage}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-sm border border-rose-950 bg-rose-950/20 px-4 py-4 text-sm text-rose-200">
          {error}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <article className="rounded-sm border border-neutral-800 bg-black px-5 py-6">
          <div className="flex items-center gap-3">
            <Headset className="h-4 w-4 text-neutral-200" />
            <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
              SUPPORT_TRANSMISSION
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, type: "ANOMALY_REPORTING" }))}
                className={`rounded-sm border px-4 py-4 text-left transition ${
                  form.type === "ANOMALY_REPORTING"
                    ? "border-zinc-100 bg-zinc-100/5 text-zinc-100"
                    : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase tracking-[0.2em]">
                    ANOMALY_REPORTING
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6">
                  Bugs, broken workflows, failed screens, missing data, or evidence issues.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, type: "ADMIN_ASSISTANCE" }))}
                className={`rounded-sm border px-4 py-4 text-left transition ${
                  form.type === "ADMIN_ASSISTANCE"
                    ? "border-zinc-100 bg-zinc-100/5 text-zinc-100"
                    : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase tracking-[0.2em]">
                    ADMIN_ASSISTANCE
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6">
                  Permission issues, operator onboarding help, governance assistance, or admin intervention.
                </p>
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(event) => setForm({ ...form, subject: event.target.value })}
                placeholder="Brief command summary"
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100 placeholder-neutral-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100">Contact Email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
                placeholder="Optional callback channel"
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100 placeholder-neutral-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100">Message</label>
              <textarea
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                required
                rows={8}
                className="mt-2 w-full rounded-sm border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-zinc-100"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-sm border border-zinc-100 bg-zinc-100 px-5 py-3 text-sm font-semibold uppercase text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Headset className="h-4 w-4" />}
              {submitting ? "TRANSMITTING..." : "TRANSMIT_REQUEST"}
            </button>
          </form>
        </article>

        <article className="rounded-sm border border-neutral-800 bg-neutral-950 px-5 py-6">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
            CHANNEL_GUIDE
          </p>

          <div className="mt-5 space-y-4">
            <div className="rounded-sm border border-neutral-800 bg-black px-4 py-4">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-100">
                ANOMALY_REPORTING
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Include the failing page, exact action taken, and any visible error message or missing evidence link.
              </p>
            </div>

            <div className="rounded-sm border border-neutral-800 bg-black px-4 py-4">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-100">
                ADMIN_ASSISTANCE
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Use this lane for access control issues, policy approvals, onboarding blockers, or manual operator intervention.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
