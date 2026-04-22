"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";

import {
  catalogueKeys,
  fetchCatalogueCourses,
  fetchCatalogueRequests,
  fetchCatalogueUserBalance,
} from "@/components/catalogue/catalogue-api";
import { AppFooter } from "@/components/shell/app-footer";
import TargetCursor from "@/components/TargetCursor";
import {
  fetchShellNotifications,
  fetchShellProfile,
  shellKeys,
} from "@/components/shell/shell-api";
import { MobileNavigation, Sidebar } from "@/components/shell/sidebar";
import { TopHeader } from "@/components/shell/top-header";
import { taskKeys, fetchTasksFromApi } from "@/components/task-board/task-api";
import { UnauthorizedError } from "@/lib/api";
import { clearStoredToken, useSessionToken } from "@/lib/session";
import { SHELL_PROFILE_REFRESH_EVENT } from "@/lib/session-events";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { token, ready } = useSessionToken();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  const {
    data: user,
    error: profileError,
    isLoading: profileLoading,
  } = useSWR(
    token ? shellKeys.profile(token) : null,
    ([, sessionToken]) => fetchShellProfile(sessionToken),
  );

  const {
    data: notificationsData,
    error: notificationsError,
    isLoading: notificationsLoadingState,
  } = useSWR(
    token ? shellKeys.notifications(token) : null,
    ([, sessionToken]) => fetchShellNotifications(sessionToken),
  );

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!token) {
      router.replace("/login");
    }
  }, [ready, router, token]);

  useEffect(() => {
    const sessionExpired =
      profileError instanceof UnauthorizedError || notificationsError instanceof UnauthorizedError;

    if (!sessionExpired) {
      return;
    }

    clearStoredToken();
    router.replace("/login");
  }, [notificationsError, profileError, router]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const sessionToken = token;

    function handleShellRefresh() {
      void mutate(shellKeys.profile(sessionToken));
      void mutate(shellKeys.notifications(sessionToken));
      void mutate(catalogueKeys.userBalance(sessionToken));
    }

    window.addEventListener(SHELL_PROFILE_REFRESH_EVENT, handleShellRefresh as EventListener);

    return () => {
      window.removeEventListener(SHELL_PROFILE_REFRESH_EVENT, handleShellRefresh as EventListener);
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const sessionToken = token;

    void mutate(taskKeys.list(sessionToken), fetchTasksFromApi({ token: sessionToken }), {
      populateCache: true,
      revalidate: false,
    });
    void mutate(catalogueKeys.courses(sessionToken), fetchCatalogueCourses(sessionToken), {
      populateCache: true,
      revalidate: false,
    });
    void mutate(catalogueKeys.requests(sessionToken), fetchCatalogueRequests(sessionToken), {
      populateCache: true,
      revalidate: false,
    });
    void mutate(
      catalogueKeys.userBalance(sessionToken),
      fetchCatalogueUserBalance(sessionToken),
      {
        populateCache: true,
        revalidate: false,
      },
    );
  }, [token]);

  const shellUser = user ?? null;
  const notifications = notificationsData?.notifications ?? [];
  const unreadNotifications = notificationsData?.unreadCount ?? 0;
  const loading = !ready || (Boolean(token) && !shellUser && profileLoading);
  const notificationsLoading =
    !ready || (Boolean(token) && !notificationsData && notificationsLoadingState);
  const error =
    profileError instanceof UnauthorizedError
      ? null
      : profileError instanceof Error
        ? profileError.message
        : null;

  return (
    <>
      <TargetCursor
        spinDuration={2}
        hideDefaultCursor
        parallaxOn
        hoverDuration={0.2}
      />

      <Sidebar
        user={shellUser}
        loading={loading}
        mobileOpen={mobileNavigationOpen}
        onClose={() => setMobileNavigationOpen(false)}
      />

      <div className="min-h-screen max-w-full overflow-x-hidden lg:pl-64">
        <TopHeader
          user={shellUser}
          loading={loading}
          notifications={notifications}
          notificationsLoading={notificationsLoading}
          unreadCount={unreadNotifications}
        />
        <MobileNavigation
          isOpen={mobileNavigationOpen}
          onToggle={() => setMobileNavigationOpen((current) => !current)}
          user={shellUser}
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
