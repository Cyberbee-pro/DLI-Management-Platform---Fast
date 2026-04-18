"use client";

import { useEffect, useState } from "react";

import { SESSION_COOKIE_NAME } from "@/lib/session-token";

function syncSessionCookie(token: string | null) {
  if (typeof document === "undefined") {
    return;
  }

  const secureAttribute = window.location.protocol === "https:" ? "; secure" : "";

  if (!token) {
    document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; samesite=lax${secureAttribute}`;
    return;
  }

  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=604800; samesite=lax${secureAttribute}`;
}

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("token");
}

export function storeStoredToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("token", token);
  syncSessionCookie(token);
}

export function clearStoredToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("token");
  syncSessionCookie(null);
}

export function useSessionToken() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function syncToken() {
      setToken(getStoredToken());
      setReady(true);
    }

    syncToken();
    window.addEventListener("storage", syncToken);

    return () => {
      window.removeEventListener("storage", syncToken);
    };
  }, []);

  return { token, ready };
}
