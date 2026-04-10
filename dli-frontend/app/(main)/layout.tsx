"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { API_BASE_URL } from "@/config/constants";
import { AppFooter } from "@/components/shell/app-footer";
import { MobileNavigation, Sidebar } from "@/components/shell/sidebar";
import { TopHeader } from "@/components/shell/top-header";
import type { ShellProfileResponse, ShellUser } from "@/components/shell/shell.types";
import { SHELL_PROFILE_REFRESH_EVENT } from "@/lib/session-events";

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
  const pathname = usePathname();
  const [user, setUser] = useState<ShellUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  const loadShellProfile = useCallback(
    async (signal?: AbortSignal) => {
      const token = window.localStorage.getItem("token");
      const profileEndpoint = buildProfileEndpoint();

      if (!token) {
        router.replace("/login");
        return;
      }

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
          signal,
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

        const nextUser: ShellUser = {
          ...payload.data.user,
          systemPoolBalance: payload.data.systemConfig?.systemPoolBalance ?? null,
        };

        setUser(nextUser);
      } catch (profileError) {
        if (signal?.aborted) {
          return;
        }

        setError(
          profileError instanceof Error
            ? profileError.message
            : "Unable to load the authenticated shell profile.",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [router],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadShellProfile(controller.signal);
    return () => controller.abort();
  }, [loadShellProfile]);

  useEffect(() => {
    function handleShellRefresh() {
      void loadShellProfile();
    }

    window.addEventListener(
      SHELL_PROFILE_REFRESH_EVENT,
      handleShellRefresh as EventListener,
    );

    return () => {
      window.removeEventListener(
        SHELL_PROFILE_REFRESH_EVENT,
        handleShellRefresh as EventListener,
      );
    };
  }, [loadShellProfile]);

  useEffect(() => {
    setMobileNavigationOpen(false);
  }, [pathname]);

  return (
    <>
      <Sidebar
        user={user}
        loading={loading}
        mobileOpen={mobileNavigationOpen}
        onClose={() => setMobileNavigationOpen(false)}
      />

      <div className="min-h-screen max-w-full overflow-x-hidden lg:pl-72">
        <TopHeader user={user} loading={loading} />
        <MobileNavigation
          isOpen={mobileNavigationOpen}
          onToggle={() => setMobileNavigationOpen((current) => !current)}
        />

        <div className="flex min-h-[calc(100vh-5rem)] flex-col">
          <main className="flex-1 max-w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
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
