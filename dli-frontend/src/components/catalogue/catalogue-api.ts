import { fetchApiJson } from "@/lib/api";

export interface Course {
  _id: string;
  title: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  provider: string;
  imageUrl: string;
  courseUrl?: string | null;
  pointsRequired: string | number;
  inventoryCount: number;
  isActive: boolean;
}

export interface CourseRequest {
  _id: string;
  status: "pending" | "approved" | "rejected" | "completed";
  requestedAt: string;
  processedAt?: string | null;
  redemptionCode?: string | null;
  course: {
    _id: string;
    title: string;
    courseUrl?: string | null;
  };
}

interface CatalogueCoursesResponse {
  success?: boolean;
  message?: string;
  data?: {
    courses?: Course[];
  };
}

interface CatalogueRequestsResponse {
  success?: boolean;
  message?: string;
  data?: CourseRequest[];
}

interface CatalogueUserResponse {
  success?: boolean;
  message?: string;
  data?: {
    user?: {
      points?: {
        balance?: number | string;
      };
    };
  };
}

interface CatalogueRequestMutationResponse {
  success?: boolean;
  message?: string;
  data?: CourseRequest;
}

export const catalogueKeys = {
  courses: (token: string) => ["catalogue-courses", token] as const,
  requests: (token: string) => ["catalogue-requests", token] as const,
  userBalance: (token: string) => ["catalogue-user-balance", token] as const,
};

function parseBalance(value: number | string | null | undefined) {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(value ?? "0");
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export async function fetchCatalogueCourses(token: string): Promise<Course[]> {
  const payload = await fetchApiJson<CatalogueCoursesResponse>({
    path: "/courses",
    token,
    fallbackMessage: "Failed to load courses.",
  });

  return Array.isArray(payload?.data?.courses) ? payload.data.courses : [];
}

export async function fetchCatalogueRequests(token: string): Promise<CourseRequest[]> {
  const payload = await fetchApiJson<CatalogueRequestsResponse>({
    path: "/requests",
    token,
    fallbackMessage: "Failed to load requests.",
  });

  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function fetchCatalogueUserBalance(token: string): Promise<number> {
  const payload = await fetchApiJson<CatalogueUserResponse>({
    path: "/users/me",
    token,
    fallbackMessage: "Failed to load user data.",
  });

  return parseBalance(payload?.data?.user?.points?.balance);
}

export async function requestCatalogueCourseAccess(
  token: string,
  courseId: string,
): Promise<CourseRequest | null> {
  const payload = await fetchApiJson<CatalogueRequestMutationResponse>({
    path: "/requests",
    method: "POST",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ courseId }),
    fallbackMessage: "Failed to request access.",
  });

  return payload?.data ?? null;
}

export async function markCatalogueRequestCompleted(
  token: string,
  requestId: string,
): Promise<CourseRequest | null> {
  const payload = await fetchApiJson<CatalogueRequestMutationResponse>({
    path: `/requests/${requestId}`,
    method: "PATCH",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "completed" }),
    fallbackMessage: "Failed to mark course completed.",
  });

  return payload?.data ?? null;
}
