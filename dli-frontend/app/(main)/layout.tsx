"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { API_BASE_URL } from "@/config/constants";
import { AppFooter } from "@/components/shell/app-footer";
import { MobileNavigation, Sidebar } from "@/components/shell/sidebar";
import { TopHeader } from "@/components/shell/top-header";
import type { ShellProfileResponse, ShellUser } from "@/components/shell/shell.types";

function buildProfileEndpoint() {
  const sanitizedBaseUrl = API_BASE_URL.replace(/\/$/, "");
  return sanitizedBaseUrl ? `${sanitizedBaseUrl}/dashboard/me` : "";
}

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [user, setUser] = useState<ShellUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem("token");
    const profileEndpoint = buildProfileEndpoint();
    const controller = new AbortController();

    if (!token) {
      router.replace("/login");
      return () => controller.abort();
    }

    async function loadShellProfile() {
      if (!profileEndpoint) {
        setError("NEXT_PUBLIC_API_URL is not configured.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(profileEndpoint, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json().catch(() => null)) as ShellProfileResponse | null;

        if (!response.ok) {
          if (response.status === 401) {
            window.localStorage.removeItem("token");
            router.replace("/login");
            return;
          }

          throw new Error(payload?.message ?? `Failed to load node profile (${response.status}).`);
        }

        if (!payload?.data?.user) {
          throw new Error("Profile response is missing the authenticated user.");
        }

        setUser(payload.data.user);
      } catch (profileError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          profileError instanceof Error
            ? profileError.message
            : "Unable to load the authenticated shell profile.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadShellProfile();

    return () => controller.abort();
  }, [router]);

  return (
    <>
      <Sidebar user={user} loading={loading} />

      <div className="min-h-screen lg:pl-72">
        <TopHeader user={user} loading={loading} />
        <MobileNavigation />

        <div className="flex min-h-[calc(100vh-5rem)] flex-col">
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            {loading ? (
              <div className="panel-surface rounded-sm border border-neutral-800 px-5 py-5">
                <div className="animate-pulse">
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-lime-300">
                    Loading_Node...
                  </p>
                  <div className="mt-4 h-4 w-40 rounded bg-neutral-800" />
                  <div className="mt-3 h-3 w-64 rounded bg-neutral-900" />
                </div>
              </div>
            ) : error ? (
              <div className="rounded-sm border border-rose-950 bg-rose-950/20 px-5 py-5 text-sm text-rose-200">
                {error}
              </div>
            ) : (
              children
            )}
          </main>
          <AppFooter />
        </div>
      </div>
    </>
  );
}
