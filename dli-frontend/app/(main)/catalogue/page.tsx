"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AlertCircle, CheckCircle2, Clock, Loader2, Lock, Star, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import {
  catalogueKeys,
  fetchCatalogueCourses,
  fetchCatalogueRequests,
  fetchCatalogueUserBalance,
  markCatalogueRequestCompleted,
  requestCatalogueCourseAccess,
  type CourseRequest,
} from "@/components/catalogue/catalogue-api";
import { UnauthorizedError } from "@/lib/api";
import { clearStoredToken, useSessionToken } from "@/lib/session";
import { dispatchShellProfileRefresh } from "@/lib/session-events";
import { decodeSessionToken } from "@/lib/session-token";

type CatalogueCourseState = "none" | "pending" | "approved" | "completed";

function getDifficultyColor(level: string): string {
  switch (level) {
    case "Beginner":
      return "text-lime-400";
    case "Intermediate":
      return "text-yellow-400";
    case "Advanced":
      return "text-red-400";
    default:
      return "text-neutral-400";
  }
}

function getDifficultyBorder(level: string): string {
  switch (level) {
    case "Beginner":
      return "border-lime-400/30 bg-lime-400/10";
    case "Intermediate":
      return "border-yellow-400/30 bg-yellow-400/10";
    case "Advanced":
      return "border-red-400/30 bg-red-400/10";
    default:
      return "border-neutral-600/30 bg-neutral-900/10";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "border-yellow-400/20 bg-yellow-400/10 text-yellow-300";
    case "approved":
      return "border-lime-400/20 bg-lime-400/10 text-lime-300";
    case "completed":
      return "border-lime-400/30 bg-lime-400/15 text-lime-200";
    case "rejected":
      return "border-rose-400/20 bg-rose-400/10 text-rose-300";
    default:
      return "border-neutral-600/30 bg-neutral-900/10 text-neutral-300";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Awaiting Admin Approval";
    case "approved":
      return "Access Granted";
    case "completed":
      return "Mission Accomplished";
    case "rejected":
      return "Request Denied";
    default:
      return "Unknown";
  }
}

export default function CataloguePage() {
  const router = useRouter();
  const { token, ready } = useSessionToken();
  const [tab, setTab] = useState<"available" | "inventory">("available");
  const [requestingCourses, setRequestingCourses] = useState<Set<string>>(new Set());
  const [completingRequests, setCompletingRequests] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: coursesData,
    error: coursesError,
    isLoading: coursesLoading,
  } = useSWR(
    token ? catalogueKeys.courses(token) : null,
    ([, sessionToken]) => fetchCatalogueCourses(sessionToken),
  );

  const {
    data: myRequestsData,
    error: requestsError,
    isLoading: requestsLoading,
    mutate: mutateRequests,
  } = useSWR(
    token ? catalogueKeys.requests(token) : null,
    ([, sessionToken]) => fetchCatalogueRequests(sessionToken),
  );

  const {
    data: userBalanceData,
    error: userBalanceError,
    isLoading: userBalanceLoading,
    mutate: mutateUserBalance,
  } = useSWR(
    token ? catalogueKeys.userBalance(token) : null,
    ([, sessionToken]) => fetchCatalogueUserBalance(sessionToken),
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
      coursesError instanceof UnauthorizedError ||
      requestsError instanceof UnauthorizedError ||
      userBalanceError instanceof UnauthorizedError;

    if (!sessionExpired) {
      return;
    }

    clearStoredToken();
    router.replace("/login");
  }, [coursesError, requestsError, router, userBalanceError]);

  const courses = coursesData ?? [];
  const myRequests = myRequestsData ?? [];
  const userBalance = userBalanceData ?? 0;
  const sessionRole = token ? decodeSessionToken(token)?.role ?? null : null;
  const isMemberView = sessionRole === "member";
  const loading =
    !ready ||
    (Boolean(token) &&
      ((!coursesData && coursesLoading) ||
        (!myRequestsData && requestsLoading) ||
        (userBalanceData === undefined && userBalanceLoading)));
  const error =
    (coursesError instanceof Error && !(coursesError instanceof UnauthorizedError)
      ? coursesError.message
      : null) ??
    (requestsError instanceof Error && !(requestsError instanceof UnauthorizedError)
      ? requestsError.message
      : null) ??
    (userBalanceError instanceof Error && !(userBalanceError instanceof UnauthorizedError)
      ? userBalanceError.message
      : null);

  const handleRequestAccess = useCallback(
    async (courseId: string) => {
      if (!token) {
        router.replace("/login");
        return;
      }

      setRequestingCourses((prev) => new Set(prev).add(courseId));

      try {
        const createdRequest = await requestCatalogueCourseAccess(token, courseId);

        if (createdRequest) {
          await mutateRequests(
            (currentRequests = []) => [
              createdRequest,
              ...currentRequests.filter((request) => request._id !== createdRequest._id),
            ],
            {
              populateCache: true,
              revalidate: false,
            },
          );
        }

        await Promise.all([mutateRequests(), mutateUserBalance()]);
        dispatchShellProfileRefresh();
        setTab("inventory");
        alert("Course request submitted successfully!");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to request access");
      } finally {
        setRequestingCourses((prev) => {
          const next = new Set(prev);
          next.delete(courseId);
          return next;
        });
      }
    },
    [mutateRequests, mutateUserBalance, router, token],
  );

  const formatXP = (xp: string | number): string => {
    const num = typeof xp === "number" ? xp : Number.parseFloat(xp ?? "0");
    return Number.isFinite(num) ? num.toLocaleString() : "0";
  };

  const getCourseUrl = (request: CourseRequest): string | null => {
    if (request.course.courseUrl) {
      return request.course.courseUrl;
    }

    return courses.find((course) => course._id === request.course._id)?.courseUrl ?? null;
  };

  const getCourseState = (courseId: string): CatalogueCourseState => {
    const matchedRequest = myRequests.find(
      (request) => request.course?._id === courseId && request.status !== "rejected"
    );

    if (!matchedRequest) {
      return "none";
    }

    if (matchedRequest.status === "completed") {
      return "completed";
    }

    if (matchedRequest.status === "approved") {
      return "approved";
    }

    if (matchedRequest.status === "pending") {
      return "pending";
    }

    return "none";
  };

  // Filter courses based on search query
  const filteredAvailableCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter user requests based on search query
  const filteredInventory = myRequests.filter(
    (request) =>
      request.course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMarkCompleted = useCallback(async (requestId: string) => {
    if (!token) {
      router.replace("/login");
      return;
    }

    setCompletingRequests((prev) => new Set(prev).add(requestId));

    try {
      const updatedRequest = await markCatalogueRequestCompleted(token, requestId);

      await mutateRequests(
        (currentRequests = []) =>
          currentRequests.map((request) =>
            request._id === requestId
              ? updatedRequest ?? { ...request, status: "completed" }
              : request,
          ),
        {
          populateCache: true,
          revalidate: false,
        },
      );

      await mutateRequests();
    } catch (completionError) {
      alert(
        completionError instanceof Error
          ? completionError.message
          : "Failed to mark course completed"
      );
    } finally {
      setCompletingRequests((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  }, [mutateRequests, router, token]);

  return (
    <div className="space-y-6 bg-black pb-4 font-sans">
      {/* Header */}
      <section className="rounded-sm border border-neutral-800 bg-black px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-lime-400">
              DLI Platform / Course Catalogue
            </p>
            <h1 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-zinc-50 sm:text-4xl">
              Premium <span className="text-lime-400">DLI</span> Courses
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
              {isMemberView
                ? "Expand your expertise with curated courses from industry leaders. Use your earned XP to request access to premium learning content."
                : "Browse the active learning catalogue and current request states in view-only mode."}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="rounded-sm border border-neutral-800 bg-black px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">Your XP Balance</p>
              <p className="mt-2 text-2xl font-semibold text-lime-400">{formatXP(userBalance)}</p>
            </div>

            <div className="rounded-sm border border-neutral-800 bg-black px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">Available Courses</p>
              <p className="mt-2 text-2xl font-semibold text-lime-400">
                {loading ? "--" : courses.length.toString().padStart(2, "0")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="space-y-4 border-b border-neutral-800 px-5">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setTab("available");
              setSearchQuery("");
            }}
            className={`px-4 py-3 text-sm font-medium uppercase tracking-widest transition ${
              tab === "available"
                ? "border-b-2 border-lime-400 text-lime-400"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            Available Modules
          </button>
          <button
            onClick={() => {
              setTab("inventory");
              setSearchQuery("");
            }}
            className={`px-4 py-3 text-sm font-medium uppercase tracking-widest transition ${
              tab === "inventory"
                ? "border-b-2 border-lime-400 text-lime-400"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            My Modules
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="flex items-center gap-2 rounded-sm border border-neutral-800 bg-neutral-950 px-4 py-2">
            <Search className="h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder={
                tab === "available"
                  ? "Search available modules..."
                  : "Search your modules..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder-neutral-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-neutral-500 hover:text-neutral-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <section className="rounded-sm border border-rose-950 bg-rose-950/20 px-4 py-4 text-sm text-rose-200">
          {error}
        </section>
      )}

      {/* Available Modules Tab */}
      {tab === "available" && (
        <>
          {loading ? (
            <section className="flex items-center gap-3 rounded-sm border border-neutral-800 bg-black px-5 py-5 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin text-lime-400" />
              Loading courses...
            </section>
          ) : filteredAvailableCourses.length === 0 ? (
            <section className="rounded-sm border border-neutral-800 bg-black px-5 py-6 text-sm text-neutral-400">
              {searchQuery
                ? "No courses match your search criteria."
                : "No courses available at this time."}
            </section>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAvailableCourses.map((course) => {
                const pointsRequired = Number.parseFloat(
                  typeof course.pointsRequired === "number"
                    ? course.pointsRequired.toString()
                    : course.pointsRequired ?? "0"
                );
                const hasEnoughXP = userBalance >= pointsRequired;
                const isRequesting = requestingCourses.has(course._id);
                const courseState = getCourseState(course._id);
                const isClaimLocked = courseState !== "none";
                const difficultyColor = getDifficultyColor(course.level);
                const difficultyBorder = getDifficultyBorder(course.level);

                return (
                  <div
                    key={course._id}
                    className="panel-surface flex flex-col rounded-sm border border-neutral-800 overflow-hidden transition hover:border-neutral-700"
                  >
                    {/* Course Image */}
                    <div className="relative h-40 w-full bg-neutral-900">
                      <Image
                        src={course.imageUrl}
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20" />
                    </div>

                    {/* Course Content */}
                    <div className="flex flex-1 flex-col p-4">
                      {/* Provider */}
                      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                        {course.provider}
                      </p>

                      {/* Title */}
                      <h3 className="mt-2 font-mono text-sm font-semibold text-zinc-100">
                        {course.title}
                      </h3>

                      {/* Description */}
                      <p className="mt-2 flex-1 text-xs leading-5 text-neutral-400">
                        {course.description}
                      </p>

                      {/* Level and XP Cost */}
                      <div className="mt-4 flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-sm border px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em] ${difficultyBorder} ${difficultyColor}`}
                        >
                          {course.level}
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1 rounded-sm border border-lime-400/20 bg-lime-400/10 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-lime-400">
                          <Star className="h-3 w-3" />
                          {formatXP(pointsRequired)} XP
                        </span>
                      </div>

                      {courseState === "completed" ? (
                        <div className="mt-4 inline-flex w-full items-center justify-center rounded-sm border border-lime-400/30 bg-lime-400/10 px-3 py-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-lime-300">
                          MISSION_ACCOMPLISHED
                        </div>
                      ) : !isMemberView ? (
                        <div className="mt-4 inline-flex w-full items-center justify-center rounded-sm border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
                          VIEW_ONLY_ACCESS
                        </div>
                      ) : (
                        <button
                          onClick={() => !isClaimLocked && handleRequestAccess(course._id)}
                          disabled={!hasEnoughXP || isRequesting || isClaimLocked}
                          className={`mt-4 w-full rounded-sm px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] transition font-mono ${
                            courseState === "approved"
                              ? "cursor-not-allowed border border-sky-400/20 bg-sky-400/10 text-sky-300"
                              : courseState === "pending"
                                ? "cursor-not-allowed border border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
                                : hasEnoughXP
                                  ? "border border-lime-400/50 bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 disabled:opacity-50"
                                  : "cursor-not-allowed border border-rose-400/30 bg-rose-400/10 text-rose-400"
                          }`}
                        >
                          {courseState === "approved" ? (
                            "MODULE_ACTIVE"
                          ) : courseState === "pending" ? (
                            "CLAIM_PENDING"
                          ) : isRequesting ? (
                            <>
                              <Loader2 className="mr-2 inline h-3 w-3 animate-spin" />
                              CLAIM_PENDING
                            </>
                          ) : hasEnoughXP ? (
                            `REDEEM ${formatXP(pointsRequired)} XP`
                          ) : (
                            <>
                              <Lock className="mr-2 inline h-3 w-3" />
                              INSUFFICIENT_XP
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* My Modules Tab */}
      {tab === "inventory" && (
        <>
          {loading ? (
            <section className="flex items-center gap-3 rounded-sm border border-neutral-800 bg-black px-5 py-5 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin text-lime-400" />
              Loading modules...
            </section>
          ) : filteredInventory.length === 0 ? (
            <section className="rounded-sm border border-neutral-800 bg-black px-5 py-6 text-sm text-neutral-400">
              {searchQuery
                ? "No items match your search criteria."
                : "No active modules yet. Request courses from the Available Modules tab to get started!"}
            </section>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredInventory.map((request) => (
                <div
                  key={request._id}
                  className="panel-surface flex flex-col rounded-sm border border-neutral-800 overflow-hidden"
                >
                  {/* Status Badge background */}
                  <div
                    className={`h-1 w-full ${
                      request.status === "pending"
                        ? "bg-yellow-400/30"
                        : request.status === "approved" || request.status === "completed"
                          ? "bg-lime-400/30"
                          : "bg-rose-400/30"
                    }`}
                  />

                  {/* Content */}
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    {/* Course Title */}
                    <h3 className="font-mono text-sm font-semibold text-zinc-100">
                      {request.course.title}
                    </h3>

                    {/* Request Metadata */}
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span>Requested {new Date(request.requestedAt).toLocaleDateString()}</span>
                      {request.processedAt && (
                        <span>Processed {new Date(request.processedAt).toLocaleDateString()}</span>
                      )}
                    </div>

                    {/* Status Progress Indicator */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">Progress</span>
                        <span className="font-mono text-xs text-neutral-400">
                          {request.status === "pending"
                            ? "0%"
                            : request.status === "approved" || request.status === "completed"
                              ? "100%"
                              : "REJECTED"}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-neutral-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            request.status === "pending"
                              ? "w-1/3 bg-yellow-400"
                              : request.status === "approved" || request.status === "completed"
                                ? "w-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.3)]"
                                : "w-0 bg-rose-400"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div
                      className={`inline-flex w-fit items-center gap-2 rounded-sm border px-3 py-2 ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {request.status === "pending" && <Clock className="h-3.5 w-3.5" />}
                      {request.status === "approved" && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {request.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {request.status === "rejected" && <AlertCircle className="h-3.5 w-3.5" />}
                      <span className="font-mono text-xs font-semibold uppercase tracking-[0.16em]">
                        {getStatusLabel(request.status)}
                      </span>
                    </div>

                    {/* Redemption Code Section */}
                    {request.status === "approved" && request.redemptionCode && (
                      <div className="space-y-2 border-t border-neutral-800 pt-4">
                        <p className="text-xs text-neutral-500">Redemption Code</p>
                        <code className="block w-full rounded-sm border border-lime-400/30 bg-lime-400/10 px-3 py-2 text-center font-mono text-sm font-semibold text-lime-300">
                          {request.redemptionCode}
                        </code>
                      </div>
                    )}

                    {request.status === "approved" ? (
                      <div className="grid gap-2 border-t border-neutral-800 pt-4 sm:grid-cols-2">
                        <a
                          href={getCourseUrl(request) ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center justify-center rounded-sm px-3 py-2 text-center font-mono text-xs font-semibold uppercase tracking-[0.15em] ${
                            getCourseUrl(request)
                              ? "border border-lime-400/30 bg-lime-400/10 text-lime-300 transition hover:bg-lime-400/20"
                              : "cursor-not-allowed border border-neutral-800 bg-neutral-900 text-neutral-500"
                          }`}
                        >
                          [LAUNCH_MODULE]
                        </a>

                        {isMemberView ? (
                          <button
                            type="button"
                            onClick={() => void handleMarkCompleted(request._id)}
                            disabled={completingRequests.has(request._id)}
                            className="inline-flex items-center justify-center rounded-sm border border-neutral-700 bg-black px-3 py-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-zinc-100 transition hover:border-lime-400/30 hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {completingRequests.has(request._id) ? (
                              <>
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                MARKING...
                              </>
                            ) : (
                              "[MARK_COMPLETED]"
                            )}
                          </button>
                        ) : null}
                      </div>
                    ) : null}


                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
