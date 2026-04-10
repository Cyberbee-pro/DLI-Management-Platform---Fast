"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BookOpen, CheckCircle2, Clock, Loader2, Lock, Star, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { API_BASE_URL } from "@/config/constants";

interface Course {
  _id: string;
  title: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  provider: string;
  imageUrl: string;
  pointsRequired: string | number;
  inventoryCount: number;
  isActive: boolean;
}

interface CourseRequest {
  _id: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  processedAt?: string | null;
  redemptionCode?: string | null;
  course: {
    _id: string;
    title: string;
  };
}

interface DecodedToken {
  _id: string;
  role: string;
  iat: number;
  exp: number;
}

interface UserPoints {
  balance: string | number;
}

function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(atob(parts[1]));
    return decoded as DecodedToken;
  } catch {
    return null;
  }
}

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

export default function CataloguePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [myRequests, setMyRequests] = useState<CourseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<"browse" | "my-requests">("browse");
  const [requestingCourses, setRequestingCourses] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Fetch user info from token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      router.push("/login");
      return;
    }

    setUserId(decoded._id);
  }, [router]);

  // Fetch courses and user balance
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const controller = new AbortController();
    const coursesEndpoint = `${API_BASE_URL.replace(/\/$/, "")}/courses`;
    const userEndpoint = `${API_BASE_URL.replace(/\/$/, "")}/users/me`;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [coursesRes, userRes] = await Promise.all([
          fetch(coursesEndpoint, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            signal: controller.signal,
          }),
          fetch(userEndpoint, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            signal: controller.signal,
          }),
        ]);

        if (!coursesRes.ok) {
          throw new Error("Failed to load courses");
        }

        if (!userRes.ok) {
          throw new Error("Failed to load user data");
        }

        const coursesData = await coursesRes.json();
        const userData = await userRes.json();

        if (!controller.signal.aborted) {
          setCourses(coursesData.data?.courses || []);
          const balance =
            typeof userData.data?.user?.points?.balance === "number"
              ? userData.data.user.points.balance
              : Number.parseFloat(userData.data?.user?.points?.balance ?? "0");
          setUserBalance(balance);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => controller.abort();
  }, []);

  // Fetch user's course requests
  useEffect(() => {
    if (tab !== "my-requests") return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const controller = new AbortController();
    const endpoint = `${API_BASE_URL.replace(/\/$/, "")}/requests`;

    async function loadRequests() {
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load requests");
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setMyRequests(Array.isArray(data.data) ? data.data : []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Failed to load requests:", err);
        }
      }
    }

    loadRequests();
    return () => controller.abort();
  }, [tab]);

  // Request access to a course
  const handleRequestAccess = useCallback(
    async (courseId: string) => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      setRequestingCourses((prev) => new Set(prev).add(courseId));

      try {
        const endpoint = `${API_BASE_URL.replace(/\/$/, "")}/requests`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            courseId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to request access");
        }

        // Refresh my requests
        setTab("my-requests");
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
    [router]
  );

  const formatXP = (xp: string | number): string => {
    const num = typeof xp === "number" ? xp : Number.parseFloat(xp ?? "0");
    return Number.isFinite(num) ? num.toLocaleString() : "0";
  };

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
              Expand your expertise with curated courses from industry leaders. Use your earned XP
              to request access to premium learning content.
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
      <div className="flex gap-2 border-b border-neutral-800 px-5">
        <button
          onClick={() => setTab("browse")}
          className={`px-4 py-3 text-sm font-medium uppercase tracking-[0.1em] transition ${
            tab === "browse"
              ? "border-b-2 border-lime-400 text-lime-400"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          Browse Courses
        </button>
        <button
          onClick={() => setTab("my-requests")}
          className={`px-4 py-3 text-sm font-medium uppercase tracking-[0.1em] transition ${
            tab === "my-requests"
              ? "border-b-2 border-lime-400 text-lime-400"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          My Requests
        </button>
      </div>

      {/* Error state */}
      {error && (
        <section className="rounded-sm border border-rose-950 bg-rose-950/20 px-4 py-4 text-sm text-rose-200">
          {error}
        </section>
      )}

      {/* Browse Courses Tab */}
      {tab === "browse" && (
        <>
          {loading ? (
            <section className="flex items-center gap-3 rounded-sm border border-neutral-800 bg-black px-5 py-5 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin text-lime-400" />
              Loading courses...
            </section>
          ) : courses.length === 0 ? (
            <section className="rounded-sm border border-neutral-800 bg-black px-5 py-6 text-sm text-neutral-400">
              No courses available at this time.
            </section>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => {
                const pointsRequired = Number.parseFloat(
                  typeof course.pointsRequired === "number"
                    ? course.pointsRequired.toString()
                    : course.pointsRequired ?? "0"
                );
                const hasEnoughXP = userBalance >= pointsRequired;
                const isRequesting = requestingCourses.has(course._id);
                const difficultyColor = getDifficultyColor(course.level);
                const difficultyBorder = getDifficultyBorder(course.level);

                return (
                  <div
                    key={course._id}
                    className="flex flex-col rounded-sm border border-neutral-800 bg-neutral-950/50 overflow-hidden transition hover:border-neutral-700"
                  >
                    {/* Course Image */}
                    <div className="relative h-40 w-full bg-neutral-900">
                      <img
                        src={course.imageUrl}
                        alt={course.title}
                        className="h-full w-full object-cover"
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

                      {/* Request Button */}
                      <button
                        onClick={() => handleRequestAccess(course._id)}
                        disabled={!hasEnoughXP || isRequesting}
                        className={`mt-4 w-full rounded-sm px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] transition ${
                          hasEnoughXP
                            ? "border border-lime-400/50 bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 disabled:opacity-50"
                            : "border border-rose-400/30 bg-rose-400/10 text-rose-400 cursor-not-allowed"
                        }`}
                      >
                        {isRequesting ? (
                          <>
                            <Loader2 className="mr-2 inline h-3 w-3 animate-spin" />
                            Requesting...
                          </>
                        ) : hasEnoughXP ? (
                          "REQUEST ACCESS"
                        ) : (
                          <>
                            <Lock className="mr-2 inline h-3 w-3" />
                            INSUFFICIENT_XP
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* My Requests Tab */}
      {tab === "my-requests" && (
        <>
          {loading ? (
            <section className="flex items-center gap-3 rounded-sm border border-neutral-800 bg-black px-5 py-5 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin text-lime-400" />
              Loading requests...
            </section>
          ) : myRequests.length === 0 ? (
            <section className="rounded-sm border border-neutral-800 bg-black px-5 py-6 text-sm text-neutral-400">
              You haven't requested any courses yet. Browse the catalogue to get started!
            </section>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <div
                  key={request._id}
                  className="flex items-center justify-between rounded-sm border border-neutral-800 bg-neutral-950/50 px-4 py-4"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold text-zinc-100">
                      {request.course.title}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Requested {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {request.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-400" />
                        <span className="inline-flex rounded-sm border border-yellow-400/20 bg-yellow-400/10 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-yellow-400">
                          Pending
                        </span>
                      </div>
                    )}

                    {request.status === "approved" && (
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-lime-400" />
                          <span className="inline-flex rounded-sm border border-lime-400/20 bg-lime-400/10 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-lime-400">
                            Approved
                          </span>
                        </div>
                        {request.redemptionCode && (
                          <p className="text-xs font-mono text-neutral-400">
                            Code: <span className="text-lime-400">{request.redemptionCode}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {request.status === "rejected" && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-400" />
                        <span className="inline-flex rounded-sm border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-rose-400">
                          Rejected
                        </span>
                      </div>
                    )}
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
