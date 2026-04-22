"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Bell, TerminalSquare } from "lucide-react";

import {
  getUserInitials,
  type ShellNotification,
  type ShellUser,
} from "@/components/shell/shell.types";

function formatNotificationTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function resolveNotificationLabel(type: ShellNotification["type"]) {
  if (type === "PROFILE_QUERY") {
    return "NETWORK_NUDGE";
  }

  if (type === "COURSE_APPROVED") {
    return "STATUS_UPDATE";
  }

  return type.replace(/_/g, " ");
}

export function TopHeader({
  user,
  loading,
  notifications,
  notificationsLoading,
  unreadCount,
}: {
  user: ShellUser | null;
  loading: boolean;
  notifications: ShellNotification[];
  notificationsLoading: boolean;
  unreadCount: number;
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const displayName = user?.name?.toUpperCase() ?? "OPERATOR";

  return (
    <header className="sticky top-0 z-30 h-20 border-b border-(--line) bg-black/70 backdrop-blur-xl">
      <div className="flex h-full items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          prefetch={true}
          aria-label="Go to the home page"
          className="cursor-target inline-flex shrink-0 items-center gap-1 text-xl font-black italic tracking-tighter text-white lg:hidden"
        >
          <span>F.A.S.T.</span>
          <span className="font-bold not-italic text-lime-400">DLI</span>
        </Link>

        <div className="min-w-0 lg:ml-auto">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-neutral-500">
            Command Channel
          </p>
          {loading ? (
            <div className="mt-2 h-5 w-56 animate-pulse rounded bg-neutral-800" />
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-sans text-base font-black uppercase tracking-[0.18em] text-white sm:text-lg">
                WELCOME_BACK,
              </span>
              <span className="font-sans text-base font-black uppercase tracking-[0.18em] text-lime-400 sm:text-lg">
                {displayName}
              </span>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Open notifications"
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((current) => !current)}
            className="cursor-target relative grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-white/8 bg-white/2 text-neutral-500 transition hover:border-lime-400/25 hover:text-lime-400"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-lime-400 px-1.5 font-mono text-[10px] font-semibold text-black">
                {Math.min(unreadCount, 9)}
              </span>
            ) : null}
          </button>

          {notificationsOpen ? (
            <div className="absolute right-0 top-14 z-40 w-88 max-w-[calc(100vw-2rem)] rounded-sm border border-neutral-800 bg-neutral-950 shadow-[0_22px_80px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-lime-300">
                    Notifications
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Nudges and mission status updates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="cursor-target font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 transition hover:text-lime-400"
                >
                  Close
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto p-3">
                {notificationsLoading ? (
                  <div className="rounded-sm border border-neutral-800 bg-black px-4 py-4 text-sm text-neutral-400">
                    Syncing notifications...
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <article
                        key={notification._id}
                        className="rounded-sm border border-neutral-800 bg-black px-4 py-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-lime-300">
                            {resolveNotificationLabel(notification.type)}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {formatNotificationTimestamp(notification.sentAt)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-zinc-200">
                          {notification.message}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-sm border border-neutral-800 bg-black px-4 py-4 text-sm text-neutral-500">
                    No active notifications in the channel.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          aria-label="Open terminal shortcuts"
          className="cursor-target grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-white/8 bg-white/2 text-neutral-500 transition hover:border-lime-400/25 hover:text-lime-400"
        >
          <TerminalSquare className="h-5 w-5" />
        </button>

        <Link
          href="/account"
          prefetch={true}
          aria-label="Open account settings"
          className="cursor-target relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-lime-400/20 bg-lime-400/10 font-mono text-xs uppercase tracking-[0.2em] text-lime-300 transition hover:border-lime-400/35 hover:bg-lime-400/15"
        >
          {loading ? (
            <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-lime-300/70" />
          ) : user?.avatarData ? (
            <Image
              src={user.avatarData}
              alt={`${user.name} avatar`}
              fill
              sizes="44px"
              className="h-full w-full object-cover"
            />
          ) : user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={`${user.name} avatar`}
              fill
              sizes="44px"
              className="h-full w-full object-cover"
            />
          ) : (
            getUserInitials(user?.name)
          )}
        </Link>
      </div>
    </header>
  );
}
