"use client";

import { useEffect, useState } from "react";
import { Link as LinkIcon, Link2, Loader2, User } from "lucide-react";

import { API_BASE_URL } from "@/config/constants";

interface RegistryUser {
  name: string;
  role: string;
  githubUsername?: string | null;
  linkedinUrl?: string | null;
  avatarUrl?: string | null;
  points?: {
    balance?: number | string | null;
  };
}

interface RegistryApiResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: RegistryUser[];
}

function buildRegistryEndpoint() {
  const sanitizedBaseUrl = API_BASE_URL.replace(/\/$/, "");
  return sanitizedBaseUrl ? `${sanitizedBaseUrl}/users` : "";
}

function parsePointsBalance(value?: number | string | null) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value ?? "0");

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function deriveRank(pointsBalance: number) {
  if (pointsBalance >= 50000) {
    return "LEGENDARY";
  }

  if (pointsBalance >= 25000) {
    return "ELITE";
  }

  if (pointsBalance >= 10000) {
    return "PROFESSIONAL";
  }

  if (pointsBalance >= 2500) {
    return "VETERAN";
  }

  return "BEGINNER";
}

function formatRole(role: string) {
  return role.replace(/_/g, " ").toUpperCase();
}

function resolveGithubUrl(username?: string | null) {
  if (!username) {
    return null;
  }

  return `https://github.com/${username.replace(/^@/, "")}`;
}

function resolveLinkedinUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function RegistryPage() {
  const [members, setMembers] = useState<RegistryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const registryEndpoint = buildRegistryEndpoint();

    async function loadRegistry() {
      if (!registryEndpoint) {
        setError("NEXT_PUBLIC_API_URL is not configured.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(registryEndpoint, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        const payload = (await response.json().catch(() => null)) as RegistryApiResponse | null;

        if (!response.ok) {
          throw new Error(payload?.message ?? `Failed to load registry (${response.status}).`);
        }

        if (!controller.signal.aborted) {
          setMembers(Array.isArray(payload?.data) ? payload.data : []);
        }
      } catch (registryError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          registryError instanceof Error
            ? registryError.message
            : "Unable to synchronize the user registry.",
        );
        setMembers([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadRegistry();

    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6 bg-black pb-4 font-sans">
      <section className="rounded-sm border border-neutral-800 bg-black px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-lime-400">
              Network Directory / User Registry
            </p>
            <h1 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-zinc-50 sm:text-4xl">
              Registered <span className="text-lime-400">Nodes</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
              Tactical registry of active members, ranked by live balance and linked through
              their external connection hubs.
            </p>
          </div>

          <div className="rounded-sm border border-neutral-800 bg-black px-4 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">Node Count</p>
            <p className="mt-2 text-2xl font-semibold text-lime-400">
              {loading ? "--" : members.length.toString().padStart(2, "0")}
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-sm border border-rose-950 bg-rose-950/20 px-4 py-4 text-sm text-rose-200">
          {error}
        </section>
      ) : null}

      {loading ? (
        <section className="flex items-center gap-3 rounded-sm border border-neutral-800 bg-black px-5 py-5 text-sm text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin text-lime-400" />
          Syncing registry nodes...
        </section>
      ) : members.length === 0 ? (
        <section className="rounded-sm border border-neutral-800 bg-black px-5 py-6 text-sm text-neutral-400">
          NO_NODES_FOUND_IN_NETWORK
        </section>
      ) : (
        <section className="overflow-hidden rounded-sm border border-neutral-800 bg-black">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 font-sans">
              <thead>
                <tr className="bg-neutral-950/70 text-left">
                  <th className="px-5 py-4 text-xs font-medium uppercase tracking-[0.22em] text-neutral-500">
                    NODE_NAME
                  </th>
                  <th className="px-5 py-4 text-xs font-medium uppercase tracking-[0.22em] text-neutral-500">
                    ROLE
                  </th>
                  <th className="px-5 py-4 text-xs font-medium uppercase tracking-[0.22em] text-neutral-500">
                    RANK
                  </th>
                  <th className="px-5 py-4 text-xs font-medium uppercase tracking-[0.22em] text-neutral-500">
                    CONNECTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => {
                  const pointsBalance = parsePointsBalance(member.points?.balance);
                  const githubUrl = resolveGithubUrl(member.githubUsername);
                  const linkedinUrl = resolveLinkedinUrl(member.linkedinUrl);
                  const rowKey = [
                    member.name,
                    member.role,
                    member.githubUsername ?? linkedinUrl ?? "",
                    index.toString(),
                  ]
                    .filter(Boolean)
                    .join(":");

                  return (
                    <tr
                      key={rowKey}
                      className="border-t border-neutral-800 transition-colors hover:bg-neutral-900/40"
                    >
                      <td className="border-t border-neutral-800 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-full border border-lime-400/20 bg-lime-400/10 text-lime-400">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium uppercase tracking-[0.08em] text-zinc-100">
                              {member.name}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                              {pointsBalance.toLocaleString()} XP
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="border-t border-neutral-800 px-5 py-4 text-sm text-neutral-400">
                        {formatRole(member.role)}
                      </td>
                      <td className="border-t border-neutral-800 px-5 py-4">
                        <span className="inline-flex rounded-sm border border-lime-400/20 bg-lime-400/10 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-lime-400">
                          {deriveRank(pointsBalance)}
                        </span>
                      </td>
                      <td className="border-t border-neutral-800 px-5 py-4">
                        <div className="flex items-center gap-2">
                          {githubUrl ? (
                            <a
                              href={githubUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${member.name}'s GitHub profile`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-neutral-800 text-neutral-400 transition hover:border-lime-400/30 hover:text-lime-400"
                            >
                              <Link2 className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-neutral-800 text-neutral-700">
                              <Link2 className="h-4 w-4" />
                            </span>
                          )}

                          {linkedinUrl ? (
                            <a
                              href={linkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${member.name}'s LinkedIn profile`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-neutral-800 text-neutral-400 transition hover:border-lime-400/30 hover:text-lime-400"
                            >
                              <LinkIcon className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-neutral-800 text-neutral-700">
                              <LinkIcon className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
