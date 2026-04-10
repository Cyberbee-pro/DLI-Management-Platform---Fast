"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, User, X } from "lucide-react";
import Image from "next/image";

import { API_BASE_URL } from "@/config/constants";

interface RegistryUser {
  _id?: string;
  name: string;
  srmRegNo?: string;
  role: string;
  githubUsername?: string | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  resumeUrl?: string | null;
  resumeData?: string | null;
  socials?: {
    github?: string | null;
    linkedin?: string | null;
    instagram?: string | null;
    website?: string | null;
  };
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

function buildRegistryEndpoint(search?: string) {
  const sanitizedBaseUrl = API_BASE_URL.replace(/\/$/, "");
  if (!sanitizedBaseUrl) return "";

  const url = `${sanitizedBaseUrl}/users`;
  return search ? `${url}?search=${encodeURIComponent(search)}` : url;
}

function parsePointsBalance(value?: number | string | null) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value ?? "0");

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function deriveRank(pointsBalance: number) {
  if (pointsBalance >= 50000) return "LEGENDARY";
  if (pointsBalance >= 25000) return "ELITE";
  if (pointsBalance >= 10000) return "PROFESSIONAL";
  if (pointsBalance >= 2500) return "VETERAN";
  return "BEGINNER";
}

function formatRole(role: string) {
  return role.replace(/_/g, " ").toUpperCase();
}

function normalizeUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function resolveGithubUrl(user: RegistryUser) {
  if (user.socials?.github) {
    return user.socials.github;
  }

  if (!user.githubUsername) {
    return null;
  }

  return `https://github.com/${user.githubUsername.replace(/^@/, "")}`;
}

function resolveSocialMap(user: RegistryUser) {
  return {
    linkedin: normalizeUrl(user.socials?.linkedin ?? user.linkedinUrl),
    github: normalizeUrl(resolveGithubUrl(user)),
    instagram: normalizeUrl(user.socials?.instagram ?? user.instagramUrl),
    website: normalizeUrl(user.socials?.website ?? user.websiteUrl),
  };
}

function SocialNode({
  href,
  iconPath,
  label,
}: {
  href: string | null;
  iconPath: string;
  label: string;
}) {
  const className = `inline-flex h-10 w-10 items-center justify-center rounded-sm border border-neutral-800 bg-black transition ${
    href
      ? "text-neutral-200 hover:border-lime-400/30 hover:bg-lime-400/10"
      : "cursor-not-allowed opacity-20"
  }`;

  if (!href) {
    return (
      <span aria-label={`${label} unavailable`} className={className}>
        <Image src={iconPath} alt="" width={16} height={16} className="h-4 w-4" />
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className={className}
    >
      <Image src={iconPath} alt="" width={16} height={16} className="h-4 w-4" />
    </a>
  );
}

export default function RegistryPage() {
  const [members, setMembers] = useState<RegistryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    const controller = new AbortController();
    const endpoint = buildRegistryEndpoint(query.trim() ? query : undefined);

    try {
      setSearching(true);
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => null)) as RegistryApiResponse | null;

      if (response.ok && !controller.signal.aborted) {
        setMembers(Array.isArray(payload?.data) ? payload.data : []);
      }
    } finally {
      if (!controller.signal.aborted) {
        setSearching(false);
      }
    }
  };

  return (
    <div className="space-y-6 bg-black pb-4 font-sans">
      <section className="rounded-sm border border-neutral-800 bg-black px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-lime-400">
              Network Directory / User Registry
            </p>
            <h1 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-zinc-50 sm:text-4xl">
              Tactical <span className="text-lime-400">Social Grid</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
              Live operator cards with social link nodes, public profile endpoints, and resume
              extraction when available.
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

      <div className="rounded-sm border border-neutral-800 bg-black px-5 py-4">
        <div className="flex items-center gap-3 rounded-sm border border-neutral-800 bg-neutral-950/50 px-4 py-2">
          <Search className="h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by name or SRM number..."
            value={searchQuery}
            onChange={(event) => void handleSearch(event.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-neutral-500 outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => void handleSearch("")}
              className="text-neutral-500 hover:text-neutral-300"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          {searching ? <Loader2 className="h-4 w-4 animate-spin text-lime-400" /> : null}
        </div>
      </div>

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
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member, index) => {
            const pointsBalance = parsePointsBalance(member.points?.balance);
            const rank = deriveRank(pointsBalance);
            const socialMap = resolveSocialMap(member);
            const resumeHref = member.resumeUrl ?? member.resumeData ?? null;
            const rowKey = [member.name, member.role, member.srmRegNo ?? index.toString()].join(":");

            return (
              <article
                key={rowKey}
                className="rounded-sm border border-neutral-800 bg-black/70 p-5 transition hover:border-neutral-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-full border border-lime-400/20 bg-lime-400/10 text-lime-400">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-100">
                        {member.name}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                        {member.srmRegNo ? `SRM: ${member.srmRegNo}` : "SRM: --"}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex rounded-sm border border-lime-400/20 bg-lime-400/10 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-lime-400">
                    {rank}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 rounded-sm border border-neutral-800 bg-neutral-950/60 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Role</p>
                    <p className="mt-2 text-sm text-zinc-100">{formatRole(member.role)}</p>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Balance</p>
                    <p className="mt-2 text-sm text-zinc-100">
                      {pointsBalance.toLocaleString("en-US")} XP
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                    Social Nodes
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SocialNode
                      href={socialMap.linkedin}
                      iconPath="/linkedin.svg"
                      label={`Open ${member.name}'s LinkedIn`}
                    />
                    <SocialNode
                      href={socialMap.github}
                      iconPath="/github.svg"
                      label={`Open ${member.name}'s GitHub`}
                    />
                    <SocialNode
                      href={socialMap.instagram}
                      iconPath="/insta.svg"
                      label={`Open ${member.name}'s Instagram`}
                    />
                    <SocialNode
                      href={socialMap.website}
                      iconPath="/globe.svg"
                      label={`Open ${member.name}'s website`}
                    />
                  </div>
                </div>

                {resumeHref ? (
                  <a
                    href={resumeHref}
                    target="_blank"
                    rel="noreferrer"
                  download={resumeHref.startsWith("data:") ? `${member.name}-resume` : undefined}
                  className="mt-5 inline-flex items-center gap-2 rounded-sm border border-neutral-800 bg-neutral-950 px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-zinc-100 transition hover:border-lime-400/30 hover:text-lime-300"
                >
                    <Image src="/file.svg" alt="" width={16} height={16} className="h-4 w-4" />
                    [DOWNLOAD_RESUME]
                  </a>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
