"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { API_BASE_URL } from "@/config/constants";

interface AuditLogRecord {
  _id: string;
  tag: string;
  action: string;
  message: string;
  timestamp: string;
  actor?: {
    _id?: string | null;
    name?: string | null;
    role?: string | null;
  } | null;
  metadata?: Record<string, unknown>;
}

interface AnalyticsApiResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: {
    logs: AuditLogRecord[];
    systemConfig?: {
      systemPoolBalance?: number | string | null;
    } | null;
  };
}

function buildAnalyticsEndpoint() {
  const sanitizedBaseUrl = API_BASE_URL.replace(/\/$/, "");
  return sanitizedBaseUrl ? `${sanitizedBaseUrl}/admin/audit-feed?limit=250` : "";
}

function formatMetric(value: string | number | null | undefined) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value ?? "0");

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return numericValue.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

function formatFeedTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function resolveTagClasses(tag: string) {
  if (tag === "AUTH") {
    return "border-sky-400/20 bg-sky-400/10 text-sky-300";
  }

  if (tag === "CLAIM") {
    return "border-lime-400/20 bg-lime-400/10 text-lime-300";
  }

  if (tag === "POOL") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  if (tag === "GOVERNANCE") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  }

  if (tag === "QUERY") {
    return "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200";
  }

  if (tag === "PROFILE") {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
  }

  return "border-neutral-700 bg-neutral-900 text-neutral-300";
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [systemPoolBalance, setSystemPoolBalance] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAuditFeed = useCallback(
    async (options?: { silent?: boolean; signal?: AbortSignal }) => {
      const token = window.localStorage.getItem("token");
      const endpoint = buildAnalyticsEndpoint();

      if (!token) {
        router.replace("/login");
        return;
      }

      if (!endpoint) {
        setError("NEXT_PUBLIC_API_URL is not configured.");
        setLoading(false);
        return;
      }

      try {
        if (options?.silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          signal: options?.signal,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json().catch(() => null)) as AnalyticsApiResponse | null;

        if (!response.ok) {
          if (response.status === 401) {
            window.localStorage.removeItem("token");
            router.replace("/login");
            return;
          }

          if (response.status === 403) {
            throw new Error("System analytics are restricted to administrators.");
          }

          throw new Error(payload?.message ?? `Failed to load audit feed (${response.status}).`);
        }

        setLogs(Array.isArray(payload?.data?.logs) ? payload.data.logs : []);
        setSystemPoolBalance(payload?.data?.systemConfig?.systemPoolBalance ?? null);
      } catch (auditFeedError) {
        if (!options?.signal?.aborted) {
          setError(
            auditFeedError instanceof Error
              ? auditFeedError.message
              : "Unable to synchronize the Black Box feed.",
          );
          setLogs([]);
        }
      } finally {
        if (!options?.signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [router],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadAuditFeed({ signal: controller.signal });
    return () => controller.abort();
  }, [loadAuditFeed]);

  const governanceEvents = logs.filter((log) => log.tag === "GOVERNANCE").length;

  if (loading) {
    return (
      <div className="panel-surface flex items-center gap-3 rounded-sm border border-neutral-800 px-5 py-5 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin text-lime-300" />
        <span className="font-mono uppercase tracking-[0.2em]">Opening black box feed...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-sm border border-rose-950 bg-rose-950/20 px-5 py-5 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
              The Black Box
            </p>
            <h1 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-zinc-50 sm:text-4xl">
              System <span className="text-lime-400">Analytics</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
              Terminal-grade audit intelligence for approvals, claims, profile governance, and
              pool-state changes across the network.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAuditFeed({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-zinc-200 transition hover:border-lime-400/30 hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {refreshing ? "Refreshing..." : "Refresh Feed"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="panel-surface rounded-sm border border-neutral-800 px-5 py-5">
          <div className="flex items-center gap-3">
            <Activity className="h-4 w-4 text-lime-300" />
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-500">
              System Pool
            </p>
          </div>
          <p className="mt-4 font-mono text-3xl font-semibold text-zinc-100">
            {formatMetric(systemPoolBalance)}
          </p>
        </article>

        <article className="panel-surface rounded-sm border border-neutral-800 px-5 py-5">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-4 w-4 text-rose-300" />
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-500">
              Governance Mirror
            </p>
          </div>
          <p className="mt-4 font-mono text-3xl font-semibold text-zinc-100">
            {governanceEvents.toString().padStart(2, "0")}
          </p>
        </article>

        <article className="panel-surface rounded-sm border border-neutral-800 px-5 py-5">
          <div className="flex items-center gap-3">
            <Activity className="h-4 w-4 text-sky-300" />
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-500">
              Feed Density
            </p>
          </div>
          <p className="mt-4 font-mono text-3xl font-semibold text-zinc-100">
            {logs.length.toString().padStart(3, "0")}
          </p>
        </article>
      </section>

      <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
              Audit Feed
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-50">Central Command Timeline</h2>
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
            {logs.length.toString().padStart(3, "0")} entries
          </p>
        </div>

        <div className="mt-6 max-h-[65vh] space-y-3 overflow-y-auto rounded-sm border border-neutral-800 bg-black p-4">
          {logs.length > 0 ? (
            logs.map((log) => (
              <article
                key={log._id}
                className="rounded-sm border border-neutral-800 bg-neutral-950 px-4 py-4 font-mono text-sm text-zinc-200"
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm leading-6 text-zinc-200">
                      [{formatFeedTimestamp(log.timestamp)}] [{log.action}] {log.message}
                    </p>
                  </div>

                  <span
                    className={[
                      "self-start rounded-sm border px-2 py-1 text-[11px] uppercase tracking-[0.18em]",
                      resolveTagClasses(log.tag),
                    ].join(" ")}
                  >
                    {log.tag}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-neutral-500">
              No audit entries are available.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
