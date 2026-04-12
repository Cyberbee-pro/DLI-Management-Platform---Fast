import { API_BASE_URL } from "@/config/constants";

interface ApiErrorPayload {
  message?: string;
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
