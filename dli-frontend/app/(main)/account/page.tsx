"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Globe,
  Link2,
  Loader2,
  Mail,
  Shield,
  UploadCloud,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { API_BASE_URL } from "@/config/constants";
import { clearStoredToken } from "@/lib/session";
import { dispatchShellProfileRefresh } from "@/lib/session-events";

interface AccountUser {
  _id: string;
  name: string;
  email: string;
  srmRegNo: string;
  role: "member" | "moderator" | "admin";
  designation?: string | null;
  avatarUrl?: string | null;
  avatarData?: string | null;
  githubUsername?: string | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  resumeUrl?: string | null;
  missingProfileVectors?: string[];
  notificationPrefs?: {
    email: boolean;
  };
}

interface AccountApiResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: {
    user: AccountUser;
  };
}

interface ProfileFormState {
  githubUsername: string;
  linkedinUrl: string;
  instagramUrl: string;
  websiteUrl: string;
  emailNotifications: boolean;
}

function buildProfileEndpoint() {
  const sanitizedBaseUrl = API_BASE_URL.replace(/\/$/, "");
  return sanitizedBaseUrl ? `${sanitizedBaseUrl}/users/me` : "";
}

function getFileNameFromUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsedUrl = new URL(value);
    const lastSegment = parsedUrl.pathname.split("/").filter(Boolean).pop();
    return lastSegment ?? "resume";
  } catch {
    return value.split("/").filter(Boolean).pop() ?? "resume";
  }
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    githubUsername: "",
    linkedinUrl: "",
    instagramUrl: "",
    websiteUrl: "",
    emailNotifications: true,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem("token");
    const endpoint = buildProfileEndpoint();
    const controller = new AbortController();

    if (!token) {
      router.replace("/login");
      return () => controller.abort();
    }

    async function loadProfile() {
      if (!endpoint) {
        setError("NEXT_PUBLIC_API_URL is not configured.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json().catch(() => null)) as AccountApiResponse | null;

        if (!response.ok) {
          if (response.status === 401) {
            clearStoredToken();
            router.replace("/login");
            return;
          }

          throw new Error(payload?.message ?? `Failed to load profile (${response.status}).`);
        }

        const nextUser = payload?.data?.user ?? null;

        if (!nextUser) {
          throw new Error("Profile data is unavailable.");
        }

        setUser(nextUser);
        setForm({
          githubUsername: nextUser.githubUsername ?? "",
          linkedinUrl: nextUser.linkedinUrl ?? "",
          instagramUrl: nextUser.instagramUrl ?? "",
          websiteUrl: nextUser.websiteUrl ?? "",
          emailNotifications: nextUser.notificationPrefs?.email ?? true,
        });
      } catch (profileError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          profileError instanceof Error
            ? profileError.message
            : "Unable to load your node configuration.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => controller.abort();
  }, [router]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const avatarPreviewUrl = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }

    // Prioritize avatarData (Base64) over avatarUrl
    return user?.avatarData ?? user?.avatarUrl ?? null;
  }, [avatarFile, user?.avatarData, user?.avatarUrl]);

  useEffect(() => {
    return () => {
      if (avatarFile && avatarPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarFile, avatarPreviewUrl]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    const token = window.localStorage.getItem("token");
    const endpoint = buildProfileEndpoint();

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!endpoint) {
      setError("NEXT_PUBLIC_API_URL is not configured.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Convert avatar file to Base64 if provided
      let avatarData: string | null = null;
      if (avatarFile) {
        avatarData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(avatarFile);
        });
      }

      // Convert resume file to Base64 if provided
      let resumeData: string | null = null;
      if (resumeFile) {
        resumeData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(resumeFile);
        });
      }

      const payload: Record<string, unknown> = {
        githubUsername: form.githubUsername,
        linkedinUrl: form.linkedinUrl,
        instagramUrl: form.instagramUrl,
        websiteUrl: form.websiteUrl,
        emailNotifications: form.emailNotifications,
      };

      if (avatarData) {
        payload.avatarData = avatarData;
      }

      if (resumeData) {
        payload.resumeData = resumeData;
      }

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const apiPayload = (await response.json().catch(() => null)) as AccountApiResponse | null;

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredToken();
          router.replace("/login");
          return;
        }

        throw new Error(apiPayload?.message ?? `Profile update failed (${response.status}).`);
      }

      const nextUser = apiPayload?.data?.user ?? null;

      if (!nextUser) {
        throw new Error("Profile update response is missing user data.");
      }

      setUser(nextUser);
      setAvatarFile(null);
      setResumeFile(null);
      setSuccessMessage("NODE_CONFIGURATION_UPDATED");
      dispatchShellProfileRefresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update your node configuration.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="panel-surface flex items-center gap-3 rounded-sm border border-neutral-800 px-5 py-5 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin text-lime-300" />
        <span className="font-mono uppercase tracking-[0.2em]">Syncing node configuration...</span>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="rounded-sm border border-rose-950 bg-rose-950/20 px-5 py-5 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-sm border border-neutral-800 bg-neutral-900/70 px-5 py-5 text-sm text-zinc-400">
        Profile data is unavailable.
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-6 pb-4">
        <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-6 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
            Professional Node Identity
          </p>
          <h1 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-zinc-50 sm:text-4xl">
            Node <span className="text-lime-400">Configuration</span>
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
            Upload your identity assets, wire your external vectors, and keep the system profile
            complete enough for governance review.
          </p>
        </section>

        {error ? (
          <section className="rounded-sm border border-rose-950 bg-rose-950/20 px-4 py-4 text-sm text-rose-200">
            {error}
          </section>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-5">
              <div className="relative mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-lime-400/20 bg-neutral-950">
                {avatarPreviewUrl ? (
                  <Image
                    src={avatarPreviewUrl}
                    alt={`${user.name} avatar`}
                    fill
                    sizes="128px"
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-neutral-500" />
                )}
              </div>

              <label className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-zinc-200 transition hover:border-lime-400/30 hover:text-lime-400">
                <UploadCloud className="h-4 w-4" />
                Upload Avatar
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                />
              </label>

              <label className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-zinc-200 transition hover:border-lime-400/30 hover:text-lime-400">
                <FileText className="h-4 w-4" />
                Upload Resume
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
                />
              </label>

              <div className="mt-4 space-y-2 text-xs text-neutral-500">
                <p>Avatar: JPEG, PNG, WEBP, or GIF up to 10MB.</p>
                <p>Resume: PDF, DOC, or DOCX up to 10MB.</p>
                <p>
                  Current resume:{" "}
                  {resumeFile?.name ?? getFileNameFromUrl(user.resumeUrl) ?? "Not uploaded"}
                </p>
              </div>

              {user.resumeUrl ? (
                <a
                  href={user.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-sm border border-lime-400/20 bg-lime-400/10 px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-lime-300 transition hover:bg-lime-400/15"
                >
                  <FileText className="h-4 w-4" />
                  Open Resume
                </a>
              ) : null}
            </section>

            <section className="panel-surface rounded-sm border border-neutral-800 px-5 py-5">
              <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                <Shield className="h-4 w-4 text-lime-400" />
                Clearance Level
              </h2>

              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <span className="block text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    Identity
                  </span>
                  <span className="text-white">{user.name}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    SRM Reg No.
                  </span>
                  <span className="font-mono text-lime-400">{user.srmRegNo}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    System Role
                  </span>
                  <span className="text-white">{user.role.toUpperCase()}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    Missing Vectors
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(user.missingProfileVectors ?? []).length > 0 ? (
                      user.missingProfileVectors?.map((item) => (
                        <span
                          key={item}
                          className="rounded-sm border border-amber-400/20 bg-amber-400/10 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-amber-200"
                        >
                          {item.replace(/Url$/, "").replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-sm border border-lime-400/20 bg-lime-400/10 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-lime-300">
                        Fully Routed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </aside>

          <form
            onSubmit={handleSave}
            className="panel-surface space-y-6 rounded-sm border border-neutral-800 px-5 py-6 sm:px-6"
          >
            <section className="space-y-4">
              <h2 className="border-b border-neutral-800 pb-3 font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                External Vectors
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                    <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                    <Link2 className="h-4 w-4" />
                    GitHub Username
                  </span>
                  <input
                    type="text"
                    value={form.githubUsername}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        githubUsername: event.target.value,
                      }))
                    }
                    className="w-full rounded-sm border border-neutral-800 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400/35"
                    placeholder="your-handle"
                  />
                </label>

                <label className="space-y-2">
                    <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                    <Link2 className="h-4 w-4" />
                    LinkedIn URL
                  </span>
                  <input
                    type="text"
                    value={form.linkedinUrl}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        linkedinUrl: event.target.value,
                      }))
                    }
                    className="w-full rounded-sm border border-neutral-800 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400/35"
                    placeholder="https://linkedin.com/in/your-node"
                  />
                </label>

                <label className="space-y-2">
                    <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                    <Link2 className="h-4 w-4" />
                    Instagram URL
                  </span>
                  <input
                    type="text"
                    value={form.instagramUrl}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        instagramUrl: event.target.value,
                      }))
                    }
                    className="w-full rounded-sm border border-neutral-800 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400/35"
                    placeholder="https://instagram.com/your-node"
                  />
                </label>

                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                    <Globe className="h-4 w-4" />
                    Website URL
                  </span>
                  <input
                    type="text"
                    value={form.websiteUrl}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        websiteUrl: event.target.value,
                      }))
                    }
                    className="w-full rounded-sm border border-neutral-800 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-lime-400/35"
                    placeholder="https://yourdomain.com"
                  />
                </label>
              </div>
            </section>

            <section className="space-y-4 pt-2">
              <h2 className="border-b border-neutral-800 pb-3 font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                Preferences
              </h2>

              <div className="flex items-center justify-between rounded-sm border border-neutral-800 bg-black px-4 py-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-neutral-400" />
                  <div>
                    <p className="text-sm text-white">System Email Alerts</p>
                    <p className="text-xs text-neutral-500">
                      Receive notifications for approvals, nudges, and mission signals.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={form.emailNotifications}
                    onChange={() =>
                      setForm((current) => ({
                        ...current,
                        emailNotifications: !current.emailNotifications,
                      }))
                    }
                  />
                  <div className="h-5 w-9 rounded-full bg-neutral-700 peer-checked:bg-lime-500 peer-checked:after:translate-x-full after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-['']" />
                </label>
              </div>
            </section>

            <div className="flex flex-col gap-4 border-t border-neutral-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                {user.email}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-lime-400 px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Updating..." : "Update Configuration"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {successMessage ? (
        <section className="fixed bottom-4 right-4 z-72 flex max-w-sm items-center gap-3 rounded-sm border border-lime-400/20 bg-neutral-950 px-4 py-4 text-sm text-lime-400 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-mono uppercase tracking-[0.18em]">{successMessage}</span>
        </section>
      ) : null}

      {error && user ? (
        <section className="fixed bottom-4 right-4 z-72 flex max-w-sm items-center gap-3 rounded-sm border border-rose-400/20 bg-neutral-950 px-4 py-4 text-sm text-rose-200 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-mono uppercase tracking-[0.18em]">{error}</span>
        </section>
      ) : null}
    </>
  );
}
