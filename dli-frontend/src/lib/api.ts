import { API_BASE_URL } from "@/config/constants";

interface ApiErrorPayload {
  message?: string;
}

export type ManagedUserRole = "member" | "moderator" | "admin";

export interface ManagedUserRecord {
  _id: string;
  name: string;
  email?: string;
  srmRegNo: string;
  role: ManagedUserRole;
  designation?: string | null;
}

export interface AwardCustomPointsRequest {
  userIds: string[];
  points: number;
  reason: string;
}

export interface AwardCustomPointsResponse {
  success: boolean;
  message?: string;
  data?: {
    awardedCount: number;
    points: number;
    reason: string;
    users: Array<{
      _id: string;
      name: string;
      srmRegNo: string;
      points: {
        balance: number;
        totalEarned: number;
        totalSpent: number;
        negativeAccrued: number;
      };
    }>;
  };
}

export interface UpdateUserRoleAndDesignationRequest {
  role: ManagedUserRole;
  designation?: string | null;
}

export interface UpdateUserRoleAndDesignationResponse {
  success: boolean;
  message?: string;
  data?: {
    user: ManagedUserRecord;
  };
}

export class UnauthorizedError extends Error {
  constructor(message = "Your session has expired.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

function normalizeApiPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildApiEndpoint(path: string) {
  const sanitizedBaseUrl = API_BASE_URL.replace(/\/$/, "");

  if (!sanitizedBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  return `${sanitizedBaseUrl}${normalizeApiPath(path)}`;
}

export async function fetchApiJson<T>({
  path,
  token,
  fallbackMessage,
  ...init
}: RequestInit & {
  path: string;
  token?: string;
  fallbackMessage?: string;
}): Promise<T> {
  const response = await fetch(buildApiEndpoint(path), {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as (ApiErrorPayload & T) | null;

  if (response.status === 401) {
    throw new UnauthorizedError();
  }

  if (!response.ok) {
    throw new Error(payload?.message ?? fallbackMessage ?? `Request failed (${response.status}).`);
  }

  return (payload ?? {}) as T;
}

export async function awardAdminCustomPoints(
  token: string,
  payload: AwardCustomPointsRequest,
): Promise<AwardCustomPointsResponse> {
  return fetchApiJson<AwardCustomPointsResponse>({
    path: "/admin/award-points",
    token,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    fallbackMessage: "Failed to award custom points.",
  });
}

export async function updateAdminUserRoleAndDesignation(
  token: string,
  userId: string,
  payload: UpdateUserRoleAndDesignationRequest,
): Promise<UpdateUserRoleAndDesignationResponse> {
  return fetchApiJson<UpdateUserRoleAndDesignationResponse>({
    path: `/admin/users/${userId}/role`,
    token,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    fallbackMessage: "Failed to update user role and designation.",
  });
}
