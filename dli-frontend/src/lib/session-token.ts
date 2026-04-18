export const SESSION_COOKIE_NAME = "dli_session";

export type SessionUserRole = "member" | "moderator" | "admin";

export interface DecodedSessionUser {
  _id: string;
  role?: SessionUserRole;
  srmRegNo?: string;
  name?: string;
}

function decodeBase64Url(value: string) {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedValue = normalizedValue.padEnd(
    normalizedValue.length + ((4 - (normalizedValue.length % 4)) % 4),
    "=",
  );

  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return window.atob(paddedValue);
  }

  return Buffer.from(paddedValue, "base64").toString("utf-8");
}

export function decodeSessionToken(token: string): DecodedSessionUser | null {
  try {
    const [, payload] = token.split(".");

    if (!payload) {
      return null;
    }

    const decodedPayload = JSON.parse(decodeBase64Url(payload)) as DecodedSessionUser | null;

    if (!decodedPayload?._id) {
      return null;
    }

    return {
      _id: decodedPayload._id,
      role: decodedPayload.role,
      srmRegNo: decodedPayload.srmRegNo,
      name: decodedPayload.name,
    };
  } catch {
    return null;
  }
}
